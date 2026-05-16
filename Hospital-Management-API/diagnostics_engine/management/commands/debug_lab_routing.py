"""
Debug diagnostic lab routing eligibility (read-only).

Operator manual: see plan document debug_lab_routing_command (full usage examples).
Runtime help: python manage.py help debug_lab_routing
"""

from __future__ import annotations

import json

from django.core.management.base import BaseCommand, CommandError

from diagnostics_engine.services.routing.routing_debug import (
    LabRoutingScenarioDebugger,
    verbose_ir_payload,
)


class Command(BaseCommand):
    help = (
        "Simulate production lab routing eligibility for pincode + test(s) + home collection. "
        "Read-only; uses EligibilityEngine._evaluate_branch. "
        "Full operator manual: plan debug_lab_routing_command."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--pincode",
            required=True,
            help="6-digit Indian pincode for service-area matching.",
        )
        parser.add_argument(
            "--test",
            action="append",
            required=True,
            dest="tests",
            metavar="TEST",
            help="Catalog test: UUID, code (e.g. LAB-CBC), or name. Repeat for multiple tests.",
        )
        parser.add_argument(
            "--home-collection",
            action="store_true",
            help="Require home collection (sample_collection_mode=home). Omit for lab walk-in.",
        )
        parser.add_argument(
            "--lab-id",
            default=None,
            help="Optional LabBranch UUID or branch_code to evaluate a single branch.",
        )
        parser.add_argument(
            "--city",
            default=None,
            help="Optional city for service-area fallback (matches production city__iexact).",
        )
        parser.add_argument(
            "--marketplace-only",
            action="store_true",
            help="Only branches in routable_lab_branches_queryset (hide non-approved orgs).",
        )
        parser.add_argument(
            "--verbose-ir",
            action="store_true",
            help="Print JSON array of per-branch ineligibility payloads after the report.",
        )
        parser.add_argument(
            "--show-sql",
            action="store_true",
            help="Print sample queryset SQL (marketplace, service area, pricing).",
        )

    def handle(self, *args, **options):
        debugger = LabRoutingScenarioDebugger()
        try:
            report = debugger.run_scenario(
                pincode=options["pincode"],
                test_tokens=options["tests"],
                home_collection=options["home_collection"],
                city=options.get("city"),
                lab_id=options.get("lab_id"),
                marketplace_only=options["marketplace_only"],
            )
        except ValueError as exc:
            raise CommandError(str(exc)) from exc

        self._print_context(report, options)
        for result in report.branch_results:
            self._print_lab(result, options)
        self._print_summary(report)

        if options["show_sql"]:
            self._print_sql_catalog(report)

        if options["verbose_ir"]:
            payload = [verbose_ir_payload(r) for r in report.branch_results]
            self.stdout.write("")
            self.stdout.write(self.style.NOTICE("VERBOSE IR (JSON)"))
            self.stdout.write(json.dumps(payload, indent=2, default=str))

    def _print_context(self, report, options) -> None:
        self.stdout.write(self.style.MIGRATE_HEADING("=" * 50))
        self.stdout.write(self.style.MIGRATE_HEADING("ROUTING CONTEXT"))
        self.stdout.write(self.style.MIGRATE_HEADING("=" * 50))
        self.stdout.write(f"Pincode: {report.location.pincode!r}  city: {report.location.city!r}")
        self.stdout.write(f"Collection mode: {report.mode!r}  (--home-collection={options['home_collection']})")
        self.stdout.write("Catalog services (DiagnosticServiceMaster):")
        for svc in report.services:
            self.stdout.write(f"  - {svc.name!r}  code={svc.code!r}  id={svc.pk}")
        self.stdout.write("")
        self.stdout.write("Production routing stack:")
        self.stdout.write("  Models: DiagnosticServiceMaster, LabBranch, LabOrganization,")
        self.stdout.write("          BranchServiceArea, BranchServicePricing")
        self.stdout.write("  Functions: routable_lab_branches_queryset,")
        self.stdout.write("             EligibilityEngine._evaluate_branch")
        self.stdout.write("             normalize_indian_pincode")
        self.stdout.write("")
        pc = report.progressive_counts
        self.stdout.write("Progressive filter counts:")
        self.stdout.write(f"  All branches in scope: {pc.get('all_branches', 0)}")
        self.stdout.write(f"  Marketplace pool: {pc.get('marketplace_pool', 0)}")
        self.stdout.write(f"  Pincode / area matched (helper): {pc.get('pincode_matched', 0)}")
        self.stdout.write(f"  Home / walk-in OK (helper): {pc.get('home_collection_ok', 0)}")
        self.stdout.write(f"  Strict pricing all tests (helper): {pc.get('strict_pricing_all_tests', 0)}")
        self.stdout.write(
            self.style.SUCCESS(f"  Final eligible (production): {pc.get('final_eligible', 0)}")
            if pc.get("final_eligible")
            else self.style.WARNING(f"  Final eligible (production): {pc.get('final_eligible', 0)}")
        )
        self.stdout.write(f"  Total SQL queries: {report.total_sql_queries}")
        self.stdout.write(f"  Total duration: {report.total_duration_ms:.1f}ms")
        self.stdout.write("")

    def _print_lab(self, result, options) -> None:
        self.stdout.write(self.style.MIGRATE_HEADING("=" * 50))
        self.stdout.write(self.style.MIGRATE_HEADING(f"LAB: {result.lab_display_name}"))
        self.stdout.write(self.style.MIGRATE_HEADING("=" * 50))
        pool_label = "yes" if result.marketplace_ok else "no"
        self.stdout.write(
            f"Marketplace pool: {pool_label} | branch_id={result.branch.pk} | "
            f"org_code={getattr(result.branch.organization, 'organization_code', '')}"
        )
        if result.marketplace_blockers:
            self.stdout.write(self.style.WARNING("Marketplace blockers:"))
            for b in result.marketplace_blockers:
                self.stdout.write(f"  - {b}")

        self.stdout.write("Production IR codes:")
        if result.ineligibility_reasons:
            for code in result.ineligibility_reasons:
                self.stdout.write(f"  - {code}")
        else:
            self.stdout.write("  (none)")
        if result.eligibility_reasons:
            self.stdout.write("Production ER codes:")
            for code in result.eligibility_reasons:
                self.stdout.write(f"  - {code}")

        if result.hypothetical_only:
            self.stdout.write(
                self.style.WARNING(
                    "Hypothetical checks below (branch excluded from production pool)."
                )
            )

        for check in result.checks:
            self._line_check(check)

        if result.pricing_results:
            self.stdout.write("Pricing detail (BranchServicePricing.service_id = catalog UUID):")
            for pr in result.pricing_results:
                if pr.strict_row_found:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"  ✓ {pr.service_name} ({pr.service_code}): "
                            f"price={pr.selling_price} strict_rows={pr.rows_strict}"
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.ERROR(
                            f"  ✗ {pr.service_name} ({pr.service_code}): "
                            f"no strict row (deleted_false={pr.rows_deleted_false})"
                        )
                    )

        if result.eligible and result.inclusion_reasons:
            self.stdout.write(self.style.SUCCESS("Included because:"))
            for reason in result.inclusion_reasons:
                self.stdout.write(self.style.SUCCESS(f"  - {reason}"))

        self.stdout.write(f"Evaluation time: {result.evaluation_time_ms:.1f}ms")
        if result.eligible:
            self.stdout.write(self.style.SUCCESS("FINAL STATUS: ELIGIBLE"))
            self.stdout.write("REASON: —")
        else:
            self.stdout.write(self.style.ERROR("FINAL STATUS: REJECTED"))
            self.stdout.write(self.style.ERROR(f"REASON: {result.primary_reason or 'UNKNOWN'}"))
        self.stdout.write("")

    def _line_check(self, check) -> None:
        mark = "✓" if check.ok else "✗"
        style = self.style.SUCCESS if check.ok else self.style.ERROR
        self.stdout.write(style(f"{mark} {check.label}: {check.detail}"))

    def _print_summary(self, report) -> None:
        self.stdout.write(self.style.MIGRATE_HEADING("=" * 50))
        self.stdout.write(self.style.MIGRATE_HEADING("ROUTING SUMMARY"))
        self.stdout.write(self.style.MIGRATE_HEADING("=" * 50))
        total = len(report.branch_results)
        eligible_n = sum(1 for r in report.branch_results if r.eligible)
        rejected_n = total - eligible_n
        self.stdout.write(f"Total Labs Checked: {total}")
        self.stdout.write(
            self.style.SUCCESS(f"Eligible Labs: {eligible_n}")
            if eligible_n
            else f"Eligible Labs: {eligible_n}"
        )
        self.stdout.write(f"Rejected Labs: {rejected_n}")
        if report.failure_breakdown:
            self.stdout.write("Failure breakdown:")
            for code, count in sorted(report.failure_breakdown.items(), key=lambda x: -x[1]):
                self.stdout.write(f"  - {code}: {count}")
        eligible_codes = [r.branch.branch_code for r in report.branch_results if r.eligible]
        if eligible_codes:
            self.stdout.write(self.style.SUCCESS(f"Eligible branch codes: {', '.join(eligible_codes)}"))
        self.stdout.write(f"Total SQL queries: {report.total_sql_queries}")
        self.stdout.write(f"Total duration: {report.total_duration_ms:.1f}ms")

    def _print_sql_catalog(self, report) -> None:
        self.stdout.write("")
        self.stdout.write(self.style.NOTICE("QUERYSET SQL (sample; UUIDs may be unquoted in str(query))"))
        for name, sql in report.queryset_catalog.items():
            self.stdout.write(self.style.NOTICE(f"--- {name} ---"))
            self.stdout.write(sql)

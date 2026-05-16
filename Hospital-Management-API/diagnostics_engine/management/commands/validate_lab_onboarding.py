"""
Validate lab branch onboarding and production routing readiness (read-only).

Operator manual: docs/backend/Hospital-Management-API/VALIDATE_LAB_ONBOARDING_OPERATOR_MANUAL.md
Runtime help: python manage.py help validate_lab_onboarding

Example:
  python manage.py validate_lab_onboarding --branch-code BR530DA223BE --pincode 416002 --test LAB-CBC --home-collection
"""

from __future__ import annotations

import json
import sys

from django.core.management.base import BaseCommand, CommandError

from diagnostics_engine.services.routing.lab_onboarding_validator import (
    SECTION_KEYS,
    LabOnboardingValidator,
)
from diagnostics_engine.services.routing.routing_debug import lab_display_name


class Command(BaseCommand):
    help = (
        "Validate whether a lab branch is fully onboarded and ready to receive "
        "diagnostic orders for a pincode and test set (read-only). "
        "Operator manual: docs/backend/Hospital-Management-API/VALIDATE_LAB_ONBOARDING_OPERATOR_MANUAL.md"
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--lab-id",
            "--branch-code",
            required=True,
            dest="lab_id",
            metavar="BRANCH",
            help=(
                "Lab branch to validate: use branch_code (e.g. BR530DA223BE) or LabBranch UUID. "
                "Same flag as --branch-code."
            ),
        )
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
            help="Catalog test: UUID, code, or name. Repeat for multiple tests.",
        )
        parser.add_argument(
            "--home-collection",
            action="store_true",
            help="Require home collection (routing mode=home). Omit for lab walk-in.",
        )
        parser.add_argument(
            "--city",
            default=None,
            help="Optional city for service-area fallback (city__iexact).",
        )
        parser.add_argument(
            "--verbose",
            action="store_true",
            help="Print queryset counts, IR/ER, blockers, and timing metrics.",
        )
        parser.add_argument(
            "--show-sql",
            action="store_true",
            help="Print sample queryset SQL (marketplace, service area, pricing).",
        )
        parser.add_argument(
            "--strict",
            action="store_true",
            help="Exit with code 1 when lab is NOT_READY (for CI/scripts).",
        )
        parser.add_argument(
            "--json",
            action="store_true",
            dest="json_output",
            help="Emit machine-readable JSON only.",
        )

    def handle(self, *args, **options):
        validator = LabOnboardingValidator(
            lab_id=options["lab_id"],
            pincode=options["pincode"],
            test_tokens=options["tests"],
            home_collection=options["home_collection"],
            city=options.get("city"),
            verbose=options["verbose"],
            show_sql=options["show_sql"],
        )
        try:
            report = validator.run()
        except ValueError as exc:
            raise CommandError(str(exc)) from exc

        if options["json_output"]:
            self.stdout.write(json.dumps(self._build_json(report), indent=2, default=str))
        else:
            self._print_human(report, options)

        if options["show_sql"] and report.queryset_catalog:
            self._print_sql(report)

        if options["verbose"] and report.verbose and not options["json_output"]:
            self._print_verbose(report)

        if options["strict"] and not report.ready:
            sys.exit(1)

    def _build_json(self, report) -> dict:
        routing = {}
        if report.routing_candidate:
            routing = {
                "mode": report.mode,
                "ineligibility_reasons": list(
                    report.routing_candidate.ineligibility_reasons
                ),
                "eligibility_reasons": list(
                    report.routing_candidate.eligibility_reasons
                ),
                "missing_tests": list(report.routing_candidate.missing_tests),
                "evaluation_time_ms": round(report.routing_eval_ms, 2),
            }
        return {
            "lab_id": report.branch.branch_code or str(report.branch.pk),
            "branch_uuid": str(report.branch.pk),
            "eligible": report.ready,
            "final_status": "READY_FOR_PRODUCTION" if report.ready else "NOT_READY",
            "failure_codes": report.failure_codes,
            "checks": report.checks,
            "blocking_issues": report.failure_codes,
            "pincode": report.location.pincode,
            "mode": report.mode,
            "services": [
                {"id": str(s.pk), "code": s.code, "name": s.name}
                for s in report.services
            ],
            "marketplace_ok": report.marketplace_ok,
            "marketplace_blockers": report.marketplace_blockers,
            "routing": routing,
            "total_duration_ms": round(report.total_duration_ms, 2),
            "verbose": report.verbose if report.verbose else None,
        }

    def _print_human(self, report, options) -> None:
        display = lab_display_name(report.branch)
        code = report.branch.branch_code or str(report.branch.pk)

        self.stdout.write(self.style.MIGRATE_HEADING("=" * 50))
        self.stdout.write(self.style.MIGRATE_HEADING("LAB READINESS STATUS"))
        self.stdout.write(self.style.MIGRATE_HEADING("=" * 50))
        self.stdout.write(f"Lab: {display}")
        self.stdout.write(f"Branch Code: {code}")
        self.stdout.write(f"Pincode: {report.location.pincode!r}  mode: {report.mode!r}")
        self.stdout.write("")

        section_titles = {
            "organization": "Organization",
            "branch": "Branch",
            "marketplace": "Marketplace",
            "service_area": "Service Area",
            "home_collection": "Home Collection"
            if report.mode == "home"
            else "Collection Mode",
            "test_catalog": "Test Catalog",
            "pricing": "Pricing",
            "routing_eligibility": "Routing Eligibility",
        }

        for key in SECTION_KEYS:
            sec = report.sections.get(key)
            if sec is None:
                continue
            title = section_titles.get(key, key)
            self.stdout.write(self.style.MIGRATE_HEADING(f"--- {title} ---"))
            for line in sec.lines:
                if line.startswith("✓"):
                    self.stdout.write(self.style.SUCCESS(line))
                elif line.startswith("✗"):
                    self.stdout.write(self.style.ERROR(line))
                else:
                    self.stdout.write(line)
            self.stdout.write("")

        self.stdout.write(self.style.MIGRATE_HEADING("=" * 50))
        if report.ready:
            self.stdout.write(
                self.style.SUCCESS("FINAL STATUS: READY_FOR_PRODUCTION")
            )
        else:
            self.stdout.write(self.style.ERROR("FINAL STATUS: NOT_READY"))
            if report.failure_codes:
                self.stdout.write("Blocking Issues:")
                for fc in report.failure_codes:
                    self.stdout.write(f"  * {fc}")
        self.stdout.write("")

        self.stdout.write(self.style.MIGRATE_HEADING("=" * 50))
        self.stdout.write(self.style.MIGRATE_HEADING("ONBOARDING SUMMARY"))
        self.stdout.write(self.style.MIGRATE_HEADING("=" * 50))
        summary_labels = {
            "organization": "Organization Checks",
            "branch": "Branch Checks",
            "marketplace": "Marketplace Checks",
            "service_area": "Service Area Checks",
            "home_collection": "Home Collection Checks",
            "test_catalog": "Test Catalog Checks",
            "pricing": "Pricing Checks",
            "routing_eligibility": "Routing Eligibility",
        }
        for key in SECTION_KEYS:
            passed = report.checks.get(key)
            label = summary_labels.get(key, key)
            status = "PASSED" if passed else "FAILED"
            style = self.style.SUCCESS if passed else self.style.ERROR
            self.stdout.write(style(f"{label}: {status}"))
        overall = "READY" if report.ready else "NOT_READY"
        style = self.style.SUCCESS if report.ready else self.style.ERROR
        self.stdout.write(style(f"Overall Readiness: {overall}"))
        self.stdout.write(f"Total duration: {report.total_duration_ms:.1f}ms")

    def _print_sql(self, report) -> None:
        self.stdout.write("")
        self.stdout.write(self.style.NOTICE("QUERYSET SQL (sample)"))
        for name, sql in report.queryset_catalog.items():
            self.stdout.write(self.style.NOTICE(f"--- {name} ---"))
            self.stdout.write(sql)

    def _print_verbose(self, report) -> None:
        self.stdout.write("")
        self.stdout.write(self.style.NOTICE("VERBOSE"))
        self.stdout.write(json.dumps(report.verbose, indent=2, default=str))

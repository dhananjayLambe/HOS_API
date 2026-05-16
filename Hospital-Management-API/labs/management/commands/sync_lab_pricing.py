from __future__ import annotations

from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from diagnostics_engine.services.pricing_templates.importer import (
    ImportStats,
    LabPricingImportStrictAbort,
    import_lab_pricing,
)


class Command(BaseCommand):
    help = "Import branch service pricing from a lab pricing XLSX workbook."

    def add_arguments(self, parser):
        parser.add_argument(
            "--file",
            required=True,
            help="Path to LabPricing_<branch_code>_v1.xlsx.",
        )
        parser.add_argument(
            "--branch-code",
            default=None,
            help="Optional branch_code; must match metadata if both are set.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Validate and report without writing to the database.",
        )
        parser.add_argument(
            "--strict",
            action="store_true",
            help="Abort entire import on first row error (rolls back when not dry-run).",
        )

    def handle(self, *args, **options):
        path = Path(options["file"])
        if not path.is_file():
            raise CommandError(f"File not found: {path}")

        try:
            stats = import_lab_pricing(
                path,
                branch_code=options.get("branch_code"),
                dry_run=options["dry_run"],
                strict=options["strict"],
            )
        except LabPricingImportStrictAbort as exc:
            stats = exc.stats or ImportStats()
            if (
                stats.errors
                or stats.created
                or stats.updated
                or stats.skipped
                or stats.unchanged
                or stats.failed
            ):
                prefix = "[dry-run] " if options["dry_run"] else ""
                self.stdout.write(self.style.MIGRATE_HEADING(f"{prefix}Lab pricing sync (aborted)"))
                self.stdout.write(f"  Created: {stats.created}")
                self.stdout.write(f"  Updated: {stats.updated}")
                self.stdout.write(f"  Skipped: {stats.skipped}")
                self.stdout.write(f"  Unchanged: {stats.unchanged}")
                self.stdout.write(f"  Failed:  {stats.failed}")
                self.stdout.write("")
                self.stdout.write(self.style.WARNING("Failed rows:"))
                for err in stats.errors:
                    self.stdout.write(self.style.ERROR(f"  {err}"))
            raise CommandError(str(exc)) from exc
        except ValueError as exc:
            raise CommandError(str(exc)) from exc

        prefix = "[dry-run] " if options["dry_run"] else ""
        self.stdout.write(self.style.MIGRATE_HEADING(f"{prefix}Lab pricing sync"))
        self.stdout.write("Import completed.")
        self.stdout.write(f"  Created: {stats.created}")
        self.stdout.write(f"  Updated: {stats.updated}")
        self.stdout.write(f"  Skipped: {stats.skipped}")
        self.stdout.write(f"  Unchanged: {stats.unchanged}")
        self.stdout.write(f"  Failed:  {stats.failed}")

        if not options["dry_run"] and stats.created == 0 and stats.updated == 0 and stats.failed == 0:
            hint_parts = []
            if stats.skipped > 0:
                hint_parts.append(
                    f"{stats.skipped} row(s) were not imported because "
                    "is_available is FALSE or blank (template defaults new rows to FALSE)."
                )
            if stats.unchanged > 0:
                hint_parts.append(
                    f"{stats.unchanged} row(s) already matched the database (no changes needed)."
                )
            if hint_parts:
                self.stdout.write("")
                self.stdout.write(self.style.WARNING("No database changes. " + " ".join(hint_parts)))

        if stats.errors:
            self.stdout.write("")
            self.stdout.write(self.style.WARNING("Failed rows:"))
            for err in stats.errors:
                self.stdout.write(self.style.ERROR(f"  {err}"))

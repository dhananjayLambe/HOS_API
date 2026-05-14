"""
Audit (and optionally dedupe) diagnostics_engine/data CSV natural keys.

Examples::

  python manage.py audit_diagnostic_catalog_csvs
  python manage.py audit_diagnostic_catalog_csvs --fix-services
"""

from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from diagnostics_engine.services.catalog_import.command_helpers import resolve_data_dir_path
from diagnostics_engine.services.catalog_import.csv_audit import (
    find_all_duplicates,
    remove_duplicate_service_rows,
)


class Command(BaseCommand):
    help = "Report duplicate keys in diagnostics CSV data; optionally remove duplicate service rows."

    def add_arguments(self, parser):
        parser.add_argument(
            "--data-dir",
            default=None,
            help="Override diagnostics_engine/data (default: app data/).",
        )
        parser.add_argument(
            "--fix-services",
            action="store_true",
            help="Rewrite services/*.csv: keep first occurrence of each code (sorted files, top to bottom).",
        )

    def handle(self, *args, **options):
        data_dir = resolve_data_dir_path(options.get("data_dir"))
        if not data_dir.is_dir():
            raise CommandError(f"Data directory not found: {data_dir}")

        dups = find_all_duplicates(data_dir)
        if not dups:
            self.stdout.write(self.style.SUCCESS("No duplicate natural keys in catalog CSVs."))
        else:
            self.stdout.write(self.style.WARNING(f"Found {len(dups)} duplicate key(s):"))
            for hit in dups:
                locs = "; ".join(f"{fn}:{ln}" for fn, ln in hit.locations)
                self.stdout.write(f"  [{hit.kind}] {hit.key!r} -> {locs}")

        if options.get("fix_services"):
            n, lines = remove_duplicate_service_rows(data_dir)
            for line in lines:
                self.stdout.write(self.style.NOTICE(line))
            if n:
                self.stdout.write(self.style.SUCCESS(f"Removed {n} duplicate service row(s) total."))
            else:
                self.stdout.write("No duplicate service rows to remove.")
            dups = find_all_duplicates(data_dir)

        if dups:
            raise CommandError(
                f"{len(dups)} duplicate key(s) remain. Fix CSVs manually "
                "(or use --fix-services if duplicates are service codes only)."
            )

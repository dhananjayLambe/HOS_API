"""
Idempotent CSV sync for DiagnosticPackageItem (latest package per ``package_code`` lineage).

Scans ``data/package_items/*.csv`` unless ``--file`` is passed (repeatable).
"""

from __future__ import annotations

from django.core.management.base import BaseCommand

from diagnostics_engine.services.catalog_import.command_helpers import (
    collect_files_from_args,
    configure_logging,
    print_entity_summary,
    resolve_data_dir_path,
    run_with_transaction,
)
from diagnostics_engine.services.catalog_import.package_items_importer import sync_package_items


class Command(BaseCommand):
    help = "Sync diagnostic package items from CSV files under data/package_items/."

    def add_arguments(self, parser):
        parser.add_argument("--data-dir", default=None)
        parser.add_argument(
            "--file",
            dest="files",
            action="append",
            default=None,
            help="CSV path (repeatable). Default: all *.csv under <data-dir>/package_items/.",
        )
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--verbose", action="store_true")
        parser.add_argument("--strict", action="store_true")

    def handle(self, *args, **options):
        configure_logging(verbose=options["verbose"])
        data_dir = resolve_data_dir_path(options.get("data_dir"))
        files = collect_files_from_args(data_dir, options.get("files"))
        dry = bool(options.get("dry_run"))
        strict = bool(options.get("strict"))

        def _run():
            return sync_package_items(data_dir=data_dir, files=files, dry_run=dry, strict=strict)

        result = run_with_transaction(_run, dry_run=dry)
        print_entity_summary(self, "Package items:", result, dry_run=dry)

"""
Idempotent CSV sync for DiagnosticCategory (roots + subcategories).

CSV column ``ordering`` is used only to sort rows before processing; it is not written to the DB.
"""

from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from diagnostics_engine.services.catalog_import.categories_importer import sync_categories
from diagnostics_engine.services.catalog_import.command_helpers import (
    configure_logging,
    print_entity_summary,
    resolve_data_dir_path,
    run_with_transaction,
)
from diagnostics_engine.services.catalog_import.utils import resolve_input_path


class Command(BaseCommand):
    help = "Sync diagnostic categories from categories.csv and subcategories.csv."

    def add_arguments(self, parser):
        parser.add_argument(
            "--data-dir",
            default=None,
            help="Override diagnostics_engine/data directory (default: app data/).",
        )
        parser.add_argument(
            "--categories-file",
            default=None,
            help="Path to categories.csv (default: <data-dir>/categories.csv).",
        )
        parser.add_argument(
            "--subcategories-file",
            default=None,
            help="Path to subcategories.csv (default: <data-dir>/subcategories.csv).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Validate and report counts without committing.",
        )
        parser.add_argument("--verbose", action="store_true", help="Enable debug logging.")
        parser.add_argument(
            "--strict",
            action="store_true",
            help="Abort on the first row-level error (raises CommandError).",
        )

    def handle(self, *args, **options):
        configure_logging(verbose=options["verbose"])
        data_dir = resolve_data_dir_path(options.get("data_dir"))

        cat_raw = options.get("categories_file")
        sub_raw = options.get("subcategories_file")
        categories_path = (
            resolve_input_path(cat_raw, data_dir=data_dir) if cat_raw else (data_dir / "categories.csv")
        )
        subcategories_path = (
            resolve_input_path(sub_raw, data_dir=data_dir)
            if sub_raw
            else (data_dir / "subcategories.csv")
        )

        for label, p in ("Categories", categories_path), ("Subcategories", subcategories_path):
            if not p.is_file():
                raise CommandError(f"{label} file not found: {p}")

        if options.get("verbose"):
            self.stdout.write(f"Using data_dir: {data_dir.resolve()}")
            self.stdout.write(f"Categories CSV: {categories_path.resolve()}")
            self.stdout.write(f"Subcategories CSV: {subcategories_path.resolve()}")

        dry = bool(options.get("dry_run"))
        strict = bool(options.get("strict"))

        def _run():
            return sync_categories(
                data_dir=data_dir,
                categories_path=categories_path,
                subcategories_path=subcategories_path,
                dry_run=dry,
                strict=strict,
            )

        result = run_with_transaction(_run, dry_run=dry)
        print_entity_summary(self, "Categories:", result, dry_run=dry)

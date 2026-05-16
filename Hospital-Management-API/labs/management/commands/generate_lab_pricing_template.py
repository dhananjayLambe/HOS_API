from __future__ import annotations

from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from diagnostics_engine.services.pricing_templates import constants as C
from diagnostics_engine.services.pricing_templates.generator import (
    build_lab_pricing_workbook,
    save_lab_pricing_workbook,
)
from labs.models import LabBranch


class Command(BaseCommand):
    help = "Generate lab pricing XLSX template for a branch."

    def add_arguments(self, parser):
        parser.add_argument(
            "--branch-code",
            required=True,
            help="LabBranch.branch_code to generate template for.",
        )
        parser.add_argument(
            "--output-dir",
            default=None,
            help="Override output directory (default: MEDIA_ROOT/lab_pricing_templates).",
        )
        parser.add_argument(
            "--generated-by",
            default=None,
            help="Value for generated_by metadata (default: DoctorPro).",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Overwrite existing template file if present.",
        )

    def handle(self, *args, **options):
        code = options["branch_code"].strip()
        try:
            branch = LabBranch.objects.select_related("organization").get(
                branch_code=code,
                is_deleted=False,
            )
        except LabBranch.DoesNotExist as exc:
            raise CommandError(f"LabBranch not found: branch_code={code!r}") from exc

        wb = build_lab_pricing_workbook(branch, generated_by=options.get("generated_by"))
        out_dir = Path(options["output_dir"]) if options.get("output_dir") else None
        try:
            path = save_lab_pricing_workbook(
                branch,
                wb,
                output_dir=out_dir,
                force=options["force"],
            )
        except FileExistsError as exc:
            raise CommandError(str(exc)) from exc

        service_count = wb[C.PRICING_SHEET_NAME].max_row - C.ROW_DATA_START + 1
        self.stdout.write(self.style.SUCCESS(f"Generated: {path}"))
        self.stdout.write(f"Services: {service_count}")
        self.stdout.write(
            "Sheet 'pricing_catalog': column D = lab_department (filter PATHOLOGY / RADIOLOGY / …). "
            "Use --force if replacing an older 11-column file."
        )

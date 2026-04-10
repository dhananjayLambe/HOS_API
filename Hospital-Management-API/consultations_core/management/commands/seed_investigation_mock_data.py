from django.core.management.base import BaseCommand
from django.db import transaction

from consultations_core.models.investigation import CustomInvestigation, InvestigationType


class Command(BaseCommand):
    help = (
        "Seed consultations_core investigation mock data. "
        "Currently seeds CustomInvestigation records (doctor-created style names)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview creation/reuse and rollback at the end.",
        )

    def handle(self, *args, **options):
        dry_run = options.get("dry_run", False)
        summary = {"custom_created": 0, "custom_reused": 0}

        with transaction.atomic():
            self._seed_custom_investigations(summary)
            if dry_run:
                transaction.set_rollback(True)

        mode = "DRY RUN" if dry_run else "APPLIED"
        self.stdout.write(self.style.SUCCESS(f"Investigation mock data seed: {mode}"))
        self.stdout.write(
            f"CustomInvestigations -> created: {summary['custom_created']}, reused: {summary['custom_reused']}"
        )
        self.stdout.write(
            "Note: ConsultationInvestigations/InvestigationItem are not auto-created "
            "to avoid generating consultation dependencies."
        )

    def _seed_custom_investigations(self, summary):
        # Realistic Indian doctor-entered custom names for API autocomplete/testing.
        records = [
            ("Fever Panel (Dengue + Malaria + Typhoid)", InvestigationType.LAB),
            ("Pre-Op Fitness Panel", InvestigationType.PACKAGE),
            ("Vitamin B12 + D3 Combo", InvestigationType.LAB),
            ("HRCT Thorax (Non-Contrast)", InvestigationType.SCAN),
            ("USG Whole Abdomen with Pelvis", InvestigationType.SCAN),
            ("Liver Elastography (FibroScan)", InvestigationType.RADIOLOGY),
            ("Renal Doppler Study", InvestigationType.RADIOLOGY),
            ("Anemia Workup Panel", InvestigationType.LAB),
        ]

        for name, inv_type in records:
            obj, created = CustomInvestigation.objects.get_or_create(
                name=name,
                defaults={
                    "investigation_type": inv_type,
                    "is_active": True,
                },
            )
            if created:
                summary["custom_created"] += 1
            else:
                summary["custom_reused"] += 1

            if obj.investigation_type != inv_type:
                obj.investigation_type = inv_type
                obj.save(update_fields=["investigation_type"])


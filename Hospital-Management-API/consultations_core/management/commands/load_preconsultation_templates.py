"""
Load and validate pre-consultation templates from JSON metadata; clear backend cache.
Run after changing templates so the API serves fresh data. For admin use only.

  python manage.py load_preconsultation_templates           # validate and clear cache
  python manage.py load_preconsultation_templates --dry-run   # validate only, no cache clear

Reads:
- consultations_core/templates_metadata/pre_consultation/sections.json
- consultations_core/templates_metadata/pre_consultation/specialty_config.json
- consultations_core/templates_metadata/pre_consultation/<section>/<section>_master.json
- consultations_core/templates_metadata/pre_consultation/<section>/<section>_details.json
- consultations_core/templates_metadata/pre_consultation/vitals/vitals_ranges.json (optional)
"""
from django.core.management.base import BaseCommand
from consultations_core.services.metadata_loader import MetadataLoader
from consultations_core.services.consultation_engine import ConsultationEngine


class Command(BaseCommand):
    help = "Load and validate pre-consultation templates; clear MetadataLoader cache so API serves fresh data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Validate templates only; do not clear cache.",
        )

    def handle(self, *args, **options):
        dry_run = options.get("dry_run", False)
        if dry_run:
            self.stdout.write("DRY RUN - validating only, cache will not be cleared")

        errors = []

        try:
            sections_cfg = MetadataLoader.get("pre_consultation/sections.json")
            sections = sections_cfg.get("sections", [])
            if not sections:
                errors.append("pre_consultation/sections.json has no 'sections' list")
            self.stdout.write(f"Sections: {sections}")
        except Exception as e:
            errors.append(f"pre_consultation/sections.json: {e}")

        try:
            specialty_cfg = MetadataLoader.get("pre_consultation/specialty_config.json")
            specialties = [k for k in specialty_cfg.keys() if not k.startswith("_") and k != "meta"]
            self.stdout.write(f"Specialties: {specialties}")
        except Exception as e:
            errors.append(f"pre_consultation/specialty_config.json: {e}")
            specialties = []

        for specialty in specialties:
            try:
                template = ConsultationEngine.get_pre_consultation_template(specialty)
                section_count = len(template.get("sections", []))
                self.stdout.write(self.style.SUCCESS(f"  {specialty}: {section_count} sections OK"))
            except Exception as e:
                errors.append(f"Specialty '{specialty}': {e}")
                self.stdout.write(self.style.ERROR(f"  {specialty}: {e}"))

        if errors:
            self.stdout.write(self.style.ERROR("Validation had errors:"))
            for err in errors:
                self.stdout.write(self.style.ERROR(f"  - {err}"))
            return

        if not dry_run:
            MetadataLoader.clear_cache()
            self.stdout.write(self.style.SUCCESS("Cache cleared. Next API request will load templates from disk."))
        else:
            self.stdout.write("Validation passed. Run without --dry-run to clear cache.")

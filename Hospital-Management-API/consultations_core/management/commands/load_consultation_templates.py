"""
Load and validate consultation templates (symptoms, findings, diagnosis, instructions);
clear consultation schema cache so the API serves fresh data. For admin use only.

Run after changing consultation template JSON so the API picks up changes.

  python manage.py load_consultation_templates           # validate and clear cache
  python manage.py load_consultation_templates --dry-run   # validate only, no cache clear

Reads:
- consultations_core/templates_metadata/consultation/sections.json
- consultations_core/templates_metadata/consultation/specialty_config.json
- consultation/symptoms/ (symptoms_master.json, symptom_details.json, specialty_symptoms.json)
- consultation/findings/ (findings_master.json, finding_details.json, specialty_findings.json)
- consultation/diagnosis/ (diagnosis_master.json, specialty_diagnosis.json)
- consultation/instructions/ (instructions_master.json, instruction_details.json, specialty_instructions.json)
"""
import json
import os

from django.conf import settings
from django.core.management.base import BaseCommand


def _load_consultation_json(relative_path: str) -> dict:
    path = os.path.join(
        settings.BASE_DIR,
        "consultations_core",
        "templates_metadata",
        "consultation",
        *relative_path.split("/"),
    )
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


class Command(BaseCommand):
    help = (
        "Load and validate consultation templates (symptoms, findings, diagnosis, instructions); "
        "clear consultation schema cache so API serves fresh data."
    )

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

        try:
            from consultation_config.services.schema_builder import (
                get_render_schema,
                clear_consultation_schema_cache,
            )
        except ImportError as e:
            self.stdout.write(self.style.ERROR(f"Import error: {e}"))
            return

        errors = []
        try:
            sections_config = _load_consultation_json("sections.json")
            global_sections = sections_config.get("sections", [])
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"sections.json: {e}"))
            return
        try:
            specialty_config = _load_consultation_json("specialty_config.json")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"specialty_config.json: {e}"))
            return

        # Only keys whose value is a dict (specialty config); skip "version", "meta", etc.
        specialties = [
            k for k in specialty_config
            if isinstance(specialty_config.get(k), dict)
            and not k.startswith("_")
            and k != "meta"
        ]
        self.stdout.write(f"Specialties: {specialties}")
        self.stdout.write(f"Sections: {global_sections}")

        for specialty in specialties:
            allowed = specialty_config[specialty].get("sections", []) or global_sections
            for section in allowed:
                if section not in global_sections:
                    continue
                try:
                    schema = get_render_schema(specialty, section)
                    items_count = len(schema.get("items", []))
                    self.stdout.write(
                        self.style.SUCCESS(f"  {specialty} / {section}: OK ({items_count} items)")
                    )
                except Exception as e:
                    errors.append(f"{specialty} / {section}: {e}")
                    self.stdout.write(self.style.ERROR(f"  {specialty} / {section}: {e}"))

        if errors:
            self.stdout.write(self.style.ERROR("Validation had errors:"))
            for err in errors:
                self.stdout.write(self.style.ERROR(f"  - {err}"))
            return

        if not dry_run:
            deleted = clear_consultation_schema_cache()
            self.stdout.write(
                self.style.SUCCESS(f"Cleared {deleted} consultation schema cache key(s).")
            )
            self.stdout.write(
                self.style.SUCCESS("Next API request will load consultation templates from disk.")
            )
        else:
            self.stdout.write("Validation passed. Run without --dry-run to clear cache.")

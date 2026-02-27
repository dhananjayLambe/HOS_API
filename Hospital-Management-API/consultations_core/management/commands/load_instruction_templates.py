# consultations_core/management/commands/load_instruction_templates.py
"""
Load instruction categories, templates, and specialty mappings from JSON metadata.
Run: python manage.py load_instruction_templates

Reads:
- consultations_core/templates_metadata/consultation/instructions/instructions_master.json
- consultations_core/templates_metadata/consultation/instructions/instruction_details.json
- consultations_core/templates_metadata/consultation/instructions/specialty_instructions.json
"""
import json
import os
from django.conf import settings
from django.core.management.base import BaseCommand
from consultations_core.models.instruction import (
    InstructionCategory,
    InstructionTemplate,
    SpecialtyInstructionMapping,
)


# Display order for categories (matches common UI order)
CATEGORY_ORDER = [
    "general_advice",
    "diet_lifestyle",
    "monitoring",
    "warning_signs",
    "activity_restriction",
    "disease_specific",
]


def load_json(relative_path: str) -> dict:
    base = settings.BASE_DIR
    path = os.path.join(base, "consultations_core", "templates_metadata", *relative_path.split("/"))
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


class Command(BaseCommand):
    help = "Load instruction categories and templates from JSON; seed specialty mappings."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would be done without writing to DB",
        )

    def handle(self, *args, **options):
        dry_run = options.get("dry_run", False)
        if dry_run:
            self.stdout.write("DRY RUN - no DB changes")

        master = load_json("consultation/instructions/instructions_master.json")
        details = load_json("consultation/instructions/instruction_details.json")
        specialty_data = load_json("consultation/instructions/specialty_instructions.json")

        items = master.get("items", {})
        if not items:
            self.stdout.write(self.style.WARNING("No items in instructions_master.json"))
            return

        # 1) Ensure all category codes exist
        seen_codes = set()
        for key, entry in items.items():
            cat_code = entry.get("category", "general_advice")
            seen_codes.add(cat_code)

        for idx, code in enumerate(CATEGORY_ORDER):
            if code not in seen_codes:
                continue
            name = code.replace("_", " ").title()
            if dry_run:
                self.stdout.write(f"Would create category: {code} - {name}")
                continue
            InstructionCategory.objects.get_or_create(
                code=code,
                defaults={"name": name, "display_order": idx, "is_active": True},
            )

        for code in seen_codes:
            if code in CATEGORY_ORDER:
                continue
            name = code.replace("_", " ").title()
            if dry_run:
                self.stdout.write(f"Would create category: {code} - {name}")
                continue
            InstructionCategory.objects.get_or_create(
                code=code,
                defaults={"name": name, "display_order": 99, "is_active": True},
            )

        # 2) Create or update InstructionTemplate for each item
        categories_by_code = {c.code: c for c in InstructionCategory.objects.all()}

        for key, entry in items.items():
            cat_code = entry.get("category", "general_advice")
            category = categories_by_code.get(cat_code)
            if not category:
                self.stdout.write(self.style.WARNING(f"Category {cat_code} not found for {key}"))
                continue

            label = entry.get("label", key)
            requires_input = entry.get("requires_input", False)
            detail_entry = details.get(key, {})
            fields = detail_entry.get("fields", [])
            input_schema = {"fields": fields} if fields else None

            if dry_run:
                self.stdout.write(f"Would create/update template: {key} - {label}")
                continue

            tpl, created = InstructionTemplate.objects.update_or_create(
                key=key,
                defaults={
                    "label": label,
                    "category": category,
                    "requires_input": requires_input,
                    "input_schema": input_schema,
                    "is_active": True,
                },
            )
            if created:
                self.stdout.write(f"Created template: {key}")

        # 3) Specialty mappings
        templates_by_key = {t.key: t for t in InstructionTemplate.objects.filter(is_active=True)}

        for specialty_key, key_list in specialty_data.items():
            if specialty_key in ("version", "meta"):
                continue
            if not isinstance(key_list, list):
                continue
            for display_order, key in enumerate(key_list):
                tpl = templates_by_key.get(key)
                if not tpl:
                    self.stdout.write(self.style.WARNING(f"Template {key} not found for specialty {specialty_key}"))
                    continue
                if dry_run:
                    self.stdout.write(f"Would map specialty {specialty_key} -> {key}")
                    continue
                SpecialtyInstructionMapping.objects.update_or_create(
                    specialty=specialty_key,
                    instruction=tpl,
                    defaults={"display_order": display_order, "is_active": True},
                )

        self.stdout.write(self.style.SUCCESS("Done."))

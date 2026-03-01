# consultations_core/models/instruction.py
from django.db import models
import uuid
from account.models import User
from consultations_core.domain.locks import EncounterLockValidator
from consultations_core.models.consultation import Consultation

# =====================================================
# 1️⃣ InstructionCategory — Global Catalog
# =====================================================


class InstructionCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=50, unique=True)  
    name = models.CharField(max_length=100)

    description = models.TextField(blank=True, null=True)
    display_order = models.IntegerField(default=0)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order"]
        indexes = [
            models.Index(fields=["code"]),
            models.Index(fields=["name"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return self.name

class InstructionTemplate(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    key = models.CharField(max_length=120, unique=True)
    label = models.CharField(max_length=255)

    category = models.ForeignKey(
        InstructionCategory,
        on_delete=models.PROTECT
    )

    description = models.TextField(blank=True, null=True)

    requires_input = models.BooleanField(default=False)

    input_schema = models.JSONField(null=True, blank=True)
    """
    Stores schema like:
    {
        "fields": [
            {
                "key": "frequency_per_day",
                "type": "number",
                "min": 1,
                "max": 6
            }
        ]
    }
    """

    is_global = models.BooleanField(default=True)


    is_active = models.BooleanField(default=True, db_index=True)
    def __str__(self):
        return self.label

    version = models.IntegerField(default=1)

    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["key"]),
            models.Index(fields=["category"]),
        ]

class InstructionTemplateVersion(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template = models.ForeignKey(
        InstructionTemplate,
        on_delete=models.CASCADE,
        related_name="versions"
    )

    version_number = models.IntegerField()

    label_snapshot = models.CharField(max_length=255)

    input_schema_snapshot = models.JSONField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        unique_together = ("template", "version_number")
        indexes = [
            models.Index(fields=["template"]),
            models.Index(fields=["version_number"]),
        ]
    def __str__(self):
        return f"{self.template.label} - Version {self.version_number}"

class SpecialtyInstructionMapping(models.Model):
    """Maps instruction templates to specialty (by code string, e.g. physician, cardiologist)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    specialty = models.CharField(max_length=100, db_index=True)

    instruction = models.ForeignKey(
        InstructionTemplate,
        on_delete=models.CASCADE,
        related_name="specialty_mappings",
    )

    is_default = models.BooleanField(default=False)

    display_order = models.IntegerField(default=0)

    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("specialty", "instruction")
    def __str__(self):
        return f"{self.specialty} - {self.instruction.label}"

class EncounterInstruction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    encounter = models.ForeignKey(
        "consultations_core.ClinicalEncounter",
        on_delete=models.CASCADE,
        related_name="instructions",
    )

    instruction_template = models.ForeignKey(
        InstructionTemplate,
        on_delete=models.PROTECT
    )

    template_version = models.ForeignKey(
        InstructionTemplateVersion,
        on_delete=models.PROTECT
    )

    input_data = models.JSONField(null=True, blank=True)

    custom_note = models.TextField(null=True, blank=True)

    is_active = models.BooleanField(default=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    added_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="added_encounter_instructions"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["encounter"]),
            models.Index(fields=["instruction_template"]),
            models.Index(fields=["is_active"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["encounter", "instruction_template", "is_active"],
                name="unique_active_instruction_per_encounter"
            )
        ]
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        try:
            consultation = self.encounter.consultation
        except Consultation.DoesNotExist:
            consultation = None
        EncounterLockValidator.validate(consultation)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.encounter.visit_pnr} - {self.instruction_template.label}"

class InstructionAuditLog(models.Model):

    encounter_instruction = models.ForeignKey(
        EncounterInstruction,
        on_delete=models.CASCADE,
        related_name="audit_logs"
    )

    action = models.CharField(
        max_length=50,
        choices=[
            ("created", "Created"),
            ("updated", "Updated"),
            ("deleted", "Deleted"),
        ],
        db_index=True
    )

    previous_data = models.JSONField(null=True, blank=True)
    new_data = models.JSONField(null=True, blank=True)

    performed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True
    )
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        indexes = [
            models.Index(fields=["encounter_instruction"]),
            models.Index(fields=["action"]),
        ]
        ordering = ["-created_at"]
    def __str__(self):
        return f"{self.encounter_instruction.encounter.visit_pnr} - {self.action}"
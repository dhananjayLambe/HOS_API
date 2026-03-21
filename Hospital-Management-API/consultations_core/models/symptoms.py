# consultations_core/models/symptoms.py

from django.db import models, transaction
from django.core.exceptions import ValidationError
from django.contrib.postgres.indexes import GinIndex
import uuid
from consultations_core.domain.locks import EncounterLockValidator


class CustomSymptom(models.Model):
    """
    Temporary custom symptom created during consultation.
    Phase-1: Attached only to single consultation.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    name = models.CharField(max_length=255, db_index=True)

    consultation = models.ForeignKey(
        "consultations_core.Consultation",
        on_delete=models.CASCADE,
        related_name="custom_symptoms"
    )

    created_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    status = models.CharField(
        max_length=20,
        choices=[
            ("pending", "Pending Review"),
            ("reviewed", "Reviewed")
        ],
        default="pending"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["name"]),
        ]

    def __str__(self):
        return self.name

# =====================================================
# 1️⃣ SymptomMaster — Global Catalog
# =====================================================

class SymptomMaster(models.Model):
    """
    Immutable global symptom catalog.
    Used for analytics, AI, and structured EMR.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    code = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Stable internal code (e.g., CHEST_PAIN)"
    )

    display_name = models.CharField(
        max_length=255,
        db_index=True,
        default="Unknown"
    )

    specialty = models.CharField(
        max_length=100,
        db_index=True,
        help_text="Mapped specialty"
    )

    is_active = models.BooleanField(default=True, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_name"]
        indexes = [
            models.Index(fields=["specialty"]),
            models.Index(fields=["display_name"]),
        ]

    def __str__(self):
        return self.display_name


# =====================================================
# 2️⃣ ConsultationSymptom — Structured Entry
# =====================================================

class ConsultationSymptom(models.Model):
    """
    Structured symptom entry.
    Immutable after consultation finalization.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    consultation = models.ForeignKey(
        "consultations_core.Consultation",
        on_delete=models.CASCADE,
        related_name="symptoms",
        db_index=True
    )

    symptom = models.ForeignKey(
        SymptomMaster,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="consultation_entries",
        db_index=True
    )
    custom_symptom = models.ForeignKey(
    CustomSymptom,
    null=True,
    blank=True,
    on_delete=models.CASCADE,
    related_name="consultation_entries"
    )
    display_name = models.CharField(max_length=255,default="Unknown")
    is_custom = models.BooleanField(default=False)
    # --------------------------
    # Structured Fields
    # --------------------------

    duration_value = models.PositiveIntegerField(null=True, blank=True)

    duration_unit = models.CharField(
        max_length=20,
        choices=[
            ("hours", "Hours"),
            ("days", "Days"),
            ("weeks", "Weeks"),
            ("months", "Months"),
            ("years", "Years"),
        ],
        null=True,
        blank=True,
        db_index=True
    )

    severity = models.CharField(
        max_length=20,
        choices=[
            ("mild", "Mild"),
            ("moderate", "Moderate"),
            ("severe", "Severe"),
        ],
        null=True,
        blank=True,
        db_index=True
    )

    onset = models.CharField(
        max_length=20,
        choices=[
            ("sudden", "Sudden"),
            ("gradual", "Gradual"),
        ],
        null=True,
        blank=True,
        db_index=True
    )

    is_primary = models.BooleanField(default=False, db_index=True)

    # --------------------------
    # Extension JSON (AI Ready)
    # --------------------------

    extra_data = models.JSONField(
        null=True,
        blank=True,
        help_text="Specialty-specific controlled extension fields"
    )

    # --------------------------
    # Audit
    # --------------------------

    is_active = models.BooleanField(default=True, db_index=True)

    created_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="symptoms_created"
    )

    updated_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="symptoms_updated"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # --------------------------
    # Meta
    # --------------------------

    class Meta:
        ordering = ["created_at"]

        constraints = [
            models.UniqueConstraint(
                fields=["consultation", "symptom"],
                name="unique_symptom_per_consultation"
            )
        ]

        indexes = [
            models.Index(fields=["consultation"]),
            models.Index(fields=["symptom"]),
            models.Index(fields=["severity"]),
            models.Index(fields=["onset"]),
            models.Index(fields=["is_primary"]),
            models.Index(fields=["duration_unit"]),
            GinIndex(fields=["extra_data"]),
        ]

    # --------------------------
    # Validation
    # --------------------------

    def clean(self):

        has_master_symptom = self.symptom is not None
        has_custom_symptom = self.custom_symptom is not None

        # Exactly one source must be provided.
        if has_master_symptom == has_custom_symptom:
            raise ValidationError(
                "Provide exactly one symptom source: either symptom or custom_symptom."
            )

        # Prevent inactive master use
        if has_master_symptom and not self.symptom.is_active:
            raise ValidationError("This symptom is inactive.")

        # Keep consistency between source and flag.
        if self.is_custom and not has_custom_symptom:
            raise ValidationError("is_custom=True requires custom_symptom.")
        if not self.is_custom and has_custom_symptom and not has_master_symptom:
            self.is_custom = True

        # For safety, custom symptom should belong to the same consultation.
        if has_custom_symptom and self.custom_symptom.consultation_id != self.consultation_id:
            raise ValidationError(
                "Custom symptom must belong to the same consultation."
            )

        # Duration validation
        if self.duration_value and not self.duration_unit:
            raise ValidationError("Duration unit required when duration value provided.")

        EncounterLockValidator.validate(self.consultation)

        # Only one primary symptom per consultation
        if self.is_primary:
            existing_primary = ConsultationSymptom.objects.filter(
                consultation=self.consultation,
                is_primary=True
            ).exclude(pk=self.pk)

            if existing_primary.exists():
                raise ValidationError("Only one primary symptom allowed per consultation.")

    # --------------------------
    # Save
    # --------------------------

    def save(self, *args, **kwargs):

        with transaction.atomic():
            if self.symptom is not None:
                self.display_name = self.symptom.display_name
                self.is_custom = False
            elif self.custom_symptom is not None:
                self.display_name = self.custom_symptom.name
                self.is_custom = True

            # UUID primary keys are populated before first save.
            # Use _state.adding to detect create vs update safely.
            if not self._state.adding:
                old = type(self).objects.only("consultation_id").get(pk=self.pk)
                if old.consultation_id != self.consultation_id:
                    raise ValidationError(
                        "Cannot reassign symptom to another consultation."
                    )

            self.full_clean()
            super().save(*args, **kwargs)

    # --------------------------
    # Soft Delete
    # --------------------------

    def deactivate(self):
        EncounterLockValidator.validate(self.consultation)
        self.is_active = False
        self.save(update_fields=["is_active"])

    def __str__(self):
        symptom_name = self.display_name
        if not symptom_name:
            if self.symptom:
                symptom_name = self.symptom.display_name
            elif self.custom_symptom:
                symptom_name = self.custom_symptom.name
            else:
                symptom_name = "Unknown"
        return f"{symptom_name} | {self.consultation.encounter.visit_pnr}"


# =====================================================
# 3️⃣ SymptomExtensionData — Controlled JSON Expansion
# =====================================================

class SymptomExtensionData(models.Model):
    """
    Specialty-specific JSON extension layer.
    AI-ready and version-controlled.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    symptom_entry = models.OneToOneField(
        "consultations_core.ConsultationSymptom",
        on_delete=models.CASCADE,
        related_name="extension"
    )

    data = models.JSONField(
        help_text="Validated specialty metadata"
    )

    schema_version = models.CharField(
        max_length=20,
        default="v1"
    )

    created_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="symptom_extensions_created"
    )

    updated_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="symptom_extensions_updated"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            GinIndex(fields=["data"]),
        ]

    def save(self, *args, **kwargs):
        with transaction.atomic():
            EncounterLockValidator.validate(self.symptom_entry.consultation)
            super().save(*args, **kwargs)

    def __str__(self):
        entry = self.symptom_entry
        if entry.symptom:
            symptom_name = entry.symptom.display_name
        elif entry.custom_symptom:
            symptom_name = entry.custom_symptom.name
        else:
            symptom_name = entry.display_name or "Unknown"
        return f"Extension | {symptom_name}"

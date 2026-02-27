# consultations_core/models/symptoms.py

from django.db import models, transaction
from django.core.exceptions import ValidationError
from django.contrib.postgres.indexes import GinIndex
import uuid


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
        db_index=True
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
        on_delete=models.PROTECT,
        related_name="consultation_entries",
        db_index=True
    )

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

        # Prevent inactive master use
        if not self.symptom.is_active:
            raise ValidationError("This symptom is inactive.")

        # Duration validation
        if self.duration_value and not self.duration_unit:
            raise ValidationError("Duration unit required when duration value provided.")

        # Block after finalization
        if self.consultation.is_finalized:
            raise ValidationError(
                "Cannot modify symptoms after consultation is finalized."
            )

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

            if self.pk:
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
        if self.consultation.is_finalized:
            raise ValidationError(
                "Cannot delete symptom after consultation finalized."
            )

        self.is_active = False
        self.save(update_fields=["is_active"])

    def __str__(self):
        return f"{self.symptom.display_name} | {self.consultation.encounter.visit_pnr}"


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

            if self.symptom_entry.consultation.is_finalized:
                raise ValidationError(
                    "Cannot modify symptom extension after consultation finalized."
                )

            super().save(*args, **kwargs)

    def __str__(self):
        return f"Extension | {self.symptom_entry.symptom.display_name}"

from django.db import models, transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
import uuid


# =====================================================
# 1️⃣ DiagnosisMaster — Global Catalog
# =====================================================

class DiagnosisMaster(models.Model):
    """
    Global Diagnosis Catalog (ICD + Template Driven)

    Enterprise Features:
    - ICD mapping (ICD10 now, extendable to ICD11)
    - Hierarchical structure (parent-child)
    - Version controlled
    - Soft deactivation supported
    - Search optimized
    - Immutable key
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    key = models.SlugField(max_length=150, unique=True, db_index=True)

    label = models.CharField(max_length=255, db_index=True)

    clinical_term = models.CharField(max_length=255, blank=True, null=True)

    icd10_code = models.CharField(max_length=20, blank=True, null=True, db_index=True)

    category = models.CharField(max_length=100, db_index=True)

    is_chronic = models.BooleanField(default=False)

    severity_supported = models.BooleanField(default=False)

    is_primary_allowed = models.BooleanField(default=True)

    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="children"
    )

    synonyms = models.JSONField(blank=True, null=True)
    search_keywords = models.JSONField(blank=True, null=True)

    is_active = models.BooleanField(default=True, db_index=True)

    version = models.PositiveIntegerField(default=1)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["label"]
        indexes = [
            models.Index(fields=["key"]),
            models.Index(fields=["icd10_code"]),
            models.Index(fields=["category"]),
            models.Index(fields=["is_active"]),
        ]

    def clean(self):
        if self.parent and self.parent_id == self.id:
            raise ValidationError("Diagnosis cannot be parent of itself.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.label} ({self.icd10_code})" if self.icd10_code else self.label


# =====================================================
# 2️⃣ Specialty Mapping
# =====================================================

class SpecialtyDiagnosisMap(models.Model):
    """
    UI-level specialty mapping.
    Does NOT restrict free-text usage.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    specialty = models.CharField(max_length=100, db_index=True)

    diagnosis = models.ForeignKey(
        DiagnosisMaster,
        on_delete=models.CASCADE,
        related_name="specialty_mappings"
    )

    is_default = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("specialty", "diagnosis")
        indexes = [models.Index(fields=["specialty"])]

    def __str__(self):
        return f"{self.specialty} → {self.diagnosis.label}"


# =====================================================
# 3️⃣ Consultation Diagnosis (Clinical Entry)
# =====================================================

class ConsultationDiagnosis(models.Model):
    """
    Consultation-level diagnosis.

    Enterprise Features:
    - Multiple diagnoses allowed
    - Single primary enforcement
    - Snapshot freeze for medico-legal safety
    - AI-ready
    - Chronic tracking
    - Immutable after consultation finalization
    - Soft delete supported
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    consultation = models.ForeignKey(
        "consultations_core.Consultation",
        on_delete=models.CASCADE,
        related_name="diagnoses"
    )

    master = models.ForeignKey(
        DiagnosisMaster,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="consultation_entries"
    )

    # Snapshot Fields (never rely only on FK)
    label = models.CharField(max_length=255)
    icd_code = models.CharField(max_length=20, blank=True, null=True)

    diagnosis_type = models.CharField(
        max_length=30,
        choices=[
            ("provisional", "Provisional"),
            ("confirmed", "Confirmed"),
            ("differential", "Differential"),
            ("chronic_condition", "Chronic Condition"),
            ("symptom_based", "Symptom Based"),
        ],
        default="provisional",
        db_index=True
    )

    severity = models.CharField(
        max_length=20,
        choices=[
            ("mild", "Mild"),
            ("moderate", "Moderate"),
            ("severe", "Severe"),
            ("critical", "Critical"),
        ],
        blank=True,
        null=True
    )

    is_primary = models.BooleanField(default=False, db_index=True)

    is_chronic = models.BooleanField(default=False)

    onset_date = models.DateField(blank=True, null=True)
    resolved_date = models.DateField(blank=True, null=True)

    doctor_note = models.TextField(blank=True, null=True)

    ai_generated = models.BooleanField(default=False)
    ai_confidence_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True
    )

    created_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnoses_created"
    )

    updated_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnoses_updated"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["consultation", "is_primary"]),
            models.Index(fields=["consultation", "diagnosis_type"]),
            models.Index(fields=["consultation", "is_active"]),
        ]

    # ==============================
    # VALIDATION
    # ==============================

    def clean(self):
        if not self.label:
            raise ValidationError("Diagnosis label is required.")

        if self.ai_confidence_score is not None:
            if not (0 <= self.ai_confidence_score <= 100):
                raise ValidationError("AI confidence must be between 0 and 100.")

        if self.severity and self.master and not self.master.severity_supported:
            raise ValidationError("Severity not supported for this diagnosis.")

        if self.is_primary:
            existing_primary = ConsultationDiagnosis.objects.filter(
                consultation=self.consultation,
                is_primary=True,
                is_active=True
            ).exclude(pk=self.pk)

            if existing_primary.exists():
                raise ValidationError("Only one primary diagnosis allowed per consultation.")

        if self.resolved_date and self.onset_date:
            if self.resolved_date < self.onset_date:
                raise ValidationError("Resolved date cannot be before onset date.")

        if self.consultation and getattr(self.consultation, "is_finalized", False):
            raise ValidationError("Cannot modify diagnosis after consultation is finalized.")

    # ==============================
    # SAVE LOGIC
    # ==============================

    def save(self, *args, **kwargs):
        with transaction.atomic():
            self.full_clean()

            # Snapshot freeze from master
            if self.master:
                self.label = self.master.label
                self.icd_code = self.master.icd10_code
                self.is_chronic = self.master.is_chronic

            # Prevent consultation reassignment
            if self.pk:
                old = ConsultationDiagnosis.objects.only("consultation_id").get(pk=self.pk)
                if old.consultation_id != self.consultation_id:
                    raise ValidationError("Diagnosis cannot be reassigned to another consultation.")

            super().save(*args, **kwargs)

    # ==============================
    # SOFT DELETE
    # ==============================

    def deactivate(self):
        if getattr(self.consultation, "is_finalized", False):
            raise ValidationError("Cannot delete diagnosis after consultation finalization.")

        self.is_active = False
        self.save(update_fields=["is_active", "updated_at"])

    def __str__(self):
        return self.label
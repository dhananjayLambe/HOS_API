"""
Consultations Core Models
#
This module contains the models for the consultations core.

The consultations core is a system that manages the consultations and the consultations core.

The consultations core is a system that manages the consultations and the consultations core.
/consultations_core/models/diagnosis.py
"""
from django.db import models, transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
import uuid
from consultations_core.domain.locks import EncounterLockValidator



class CustomDiagnosis(models.Model):
    """
    Custom diagnosis created during consultation.
    NOT part of master catalog.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    name = models.CharField(max_length=255, db_index=True)

    consultation = models.ForeignKey(
        "consultations_core.Consultation",
        on_delete=models.CASCADE,
        related_name="custom_diagnoses"
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
    #AUdit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="custom_diagnoses_deleted"
    )
    class Meta:
        ordering = ["name"]
        unique_together = ("consultation", "name")
        indexes = [
            models.Index(fields=["consultation"]),
        ]

    def __str__(self):
        return self.name

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
    #Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnosis_masters_deleted"
    )
    class Meta:
        ordering = ["label"]
        indexes = [
            models.Index(fields=["key"]),
            models.Index(fields=["icd10_code"]),
            models.Index(fields=["category"]),
            models.Index(fields=["is_active"]),
            models.Index(fields=["parent"]),
            models.Index(fields=["label"]),
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
    #Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="specialty_diagnosis_maps_deleted"
    )
    class Meta:
        unique_together = ("specialty", "diagnosis")
        indexes = [
            models.Index(fields=["specialty"]),
            models.Index(fields=["diagnosis"]),
        ]

    def __str__(self):
        return f"{self.specialty} → {self.diagnosis.label}"


# =====================================================
# 3️⃣ Consultation Diagnosis (Clinical Entry)
# =====================================================

class ConsultationDiagnosis(models.Model):
    """
    Consultation-level diagnosis.

    Supports:
    - Master diagnosis (ICD)
    - Custom diagnosis
    - Snapshot (medico-legal safe)
    - Primary diagnosis enforcement

    Enterprise Features:
    - Multiple diagnoses allowed
    - Single primary enforcement
    - Snapshot freeze for medico-legal safety
    - AI-ready
    - Chronic tracking
    - Immutable after consultation finalization
    - Soft delete supported
    """

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False)
    display_name = models.CharField(
        max_length=255, default="Unknown")
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
    custom_diagnosis = models.ForeignKey(
        CustomDiagnosis,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="consultation_entries"
    )
    is_custom = models.BooleanField(default=False, db_index=True)
    
    # Snapshot Fields (never rely only on FK)
    label = models.CharField(max_length=255)
    icd_code = models.CharField(max_length=20, blank=True, null=True)
    # --------------------------
    # Clinical Attributes
    # --------------------------
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
    # Snapshot (MEDICO-LEGAL SAFE) Fields (never rely only on FK)

    #Audit
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
    source = models.CharField(
        max_length=20,
        choices=[
            ("emr", "From EMR"),
            ("app", "From Patient App"),
            ("admin", "Manual/Admin"),
            ("api", "External API"),
        ],
        default="emr",
        db_index=True
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
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnoses_deleted"
    )
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["consultation", "is_primary"]),
            models.Index(fields=["consultation", "diagnosis_type"]),
            models.Index(fields=["consultation", "is_active"]),
            models.Index(fields=["source"]),
            models.Index(fields=["consultation", "is_active", "is_primary"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["consultation"],
                condition=models.Q(is_primary=True, is_active=True),
                name="unique_active_primary_diagnosis_per_consultation"
            )
        ]

    # ==============================
    # VALIDATION
    # ==============================

    def clean(self):
        has_master = self.master is not None
        has_custom = self.custom_diagnosis is not None

        # Only one source allowed
        if has_master == has_custom:
            raise ValidationError(
                "Provide exactly one source: master or custom diagnosis."
            )

        # Custom must belong to same consultation
        if has_custom and self.custom_diagnosis.consultation_id != self.consultation_id:
            raise ValidationError(
                "Custom diagnosis must belong to same consultation."
            )

        if self.ai_confidence_score is not None:
            if not (0 <= self.ai_confidence_score <= 100):
                raise ValidationError("AI confidence must be between 0 and 100.")

        if self.severity and self.master and not self.master.severity_supported:
            raise ValidationError("Severity not supported for this diagnosis.")

        # Only one primary diagnosis
        if self.is_primary:
            existing_primary = ConsultationDiagnosis.objects.filter(
                consultation=self.consultation,
                is_primary=True,
                is_active=True
            ).exclude(pk=self.pk)

            if existing_primary.exists():
                raise ValidationError(
                    "Only one primary diagnosis allowed per consultation."
                )
            if self.master and not self.master.is_primary_allowed:
                raise ValidationError("This diagnosis cannot be marked as primary.")

        # Date validation
        if self.resolved_date and self.onset_date:
            if self.resolved_date < self.onset_date:
                raise ValidationError(
                    "Resolved date cannot be before onset date."
                )

        EncounterLockValidator.validate(self.consultation)

    # ==============================
    # SAVE LOGIC
    # ==============================

    def save(self, *args, **kwargs):
        with transaction.atomic():

            # Snapshot assignment
            if self.master:
                self.label = self.master.label
                self.icd_code = self.master.icd10_code
                self.is_chronic = self.master.is_chronic
                self.is_custom = False

            elif self.custom_diagnosis:
                self.label = self.custom_diagnosis.name
                self.icd_code = None
                self.is_custom = True

            # Prevent reassignment
            # UUID PK exists before first insert; use ORM state to detect updates.
            if self.pk and not self._state.adding:
                old = ConsultationDiagnosis.objects.only("consultation_id").get(pk=self.pk)
                if old.consultation_id != self.consultation_id:
                    raise ValidationError(
                        "Diagnosis cannot be reassigned to another consultation."
                    )

            if not self.display_name:
                self.display_name = self.label

            self.full_clean()
            super().save(*args, **kwargs)

    # ==============================
    # SOFT DELETE
    # ==============================

    def deactivate(self):
        EncounterLockValidator.validate(self.consultation)
        self.is_active = False
        self.deleted_at = timezone.now()
        self.deleted_by = None
        self.save(update_fields=["is_active", "updated_at", "deleted_at", "deleted_by"])

    def delete(self, *args, **kwargs):
        raise ValidationError(
            "Hard delete not allowed. Use deactivate()."
        )

    def __str__(self):
        return self.label
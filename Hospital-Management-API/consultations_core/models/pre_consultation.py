import uuid
from django.db import models
from django.utils import timezone
from account.models import User
from consultations_core.models.encounter import ClinicalEncounter

class PreConsultation(models.Model):
    """
    Represents pre-consultation data collected before doctor consultation.
    Optional, template-driven, auditable, and lockable.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # 🔗 VISIT CONTEXT
    encounter = models.OneToOneField(
        ClinicalEncounter,
        on_delete=models.CASCADE,
        related_name="pre_consultation"
    )
    # 🧠 TEMPLATE CONTEXT (VERY IMPORTANT)
    specialty_code = models.CharField(
        max_length=50,
        help_text="Specialty code used to resolve templates (e.g. gynecology, physician)"
    )
    template_version = models.CharField(
        max_length=20,
        default="v1",
        help_text="Template version used at time of data entry"
    )
    # 📊 COMPLETION STATE
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Set when pre-consultation is marked complete"
    )
    # 🔒 LOCKING & FINALITY
    is_locked = models.BooleanField(
        default=False,
        help_text="Locked once consultation starts"
    )
    locked_at = models.DateTimeField(
        null=True,
        blank=True
    )
    lock_reason = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Reason for locking (e.g. Consultation started)"
    )
    # 🧭 ENTRY METADATA
    entry_mode = models.CharField(
        max_length=20,
        choices=[
            ("helpdesk", "Helpdesk"),
            ("doctor", "Doctor"),
            ("patient", "Patient"),
            ("system", "System"),
        ],
        default="helpdesk"
    )
    # 👤 AUDIT
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="preconsultations_created"
    )

    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="preconsultations_updated"
    )

    # 🔁 LIFECYCLE
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # ======================
    # DOMAIN METHODS
    # ======================

    def lock(self, reason="Consultation started"):
        self.is_locked = True
        self.locked_at = timezone.now()
        self.lock_reason = reason
        self.save(update_fields=["is_locked", "locked_at", "lock_reason"])

    def mark_completed(self):
        self.completed_at = timezone.now()
        self.save(update_fields=["completed_at"])

    class Meta:
        verbose_name = "Pre Consultation"
        verbose_name_plural = "Pre Consultations"
        ordering = ["-created_at"]

    def __str__(self):
        return f"PreConsultation | {self.encounter.visit_pnr}"

# =====================================================
# 🧩 PRE-CONSULTATION SECTIONS (JSONB, TEMPLATE-DRIVEN)
# =====================================================
class BasePreConsultationSection(models.Model):
    """
    Abstract base for all pre-consultation sections.
    Handles audit, lifecycle, and JSON storage.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    pre_consultation = models.OneToOneField(
        PreConsultation,
        on_delete=models.CASCADE
    )

    # 🧠 SECTION METADATA
    section_code = models.CharField(
        max_length=50,
        help_text="Section identifier (e.g. vitals, chief_complaint)"
    )

    schema_version = models.CharField(
        max_length=20,
        default="v1",
        help_text="Schema version of this section"
    )

    # 📦 DATA
    data = models.JSONField(
        help_text="Template-driven JSON data for this section"
    )

    # 🔁 LIFECYCLE
    is_active = models.BooleanField(default=True)

    # 👤 AUDIT
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="%(class)s_created"
    )
    updated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="%(class)s_updated"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class PreConsultationVitals(BasePreConsultationSection):
    class Meta:
        verbose_name = "PreConsultation Vitals"
        verbose_name_plural = "PreConsultation Vitals"

    def save(self, *args, **kwargs):
        self.section_code = "vitals"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Vitals | {self.pre_consultation.encounter.visit_pnr}"

class PreConsultationChiefComplaint(BasePreConsultationSection):
    class Meta:
        verbose_name = "PreConsultation Chief Complaint"
        verbose_name_plural = "PreConsultation Chief Complaints"

    def save(self, *args, **kwargs):
        self.section_code = "chief_complaint"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Chief Complaint | {self.pre_consultation.encounter.visit_pnr}"

class PreConsultationAllergies(BasePreConsultationSection):
    class Meta:
        verbose_name = "PreConsultation Allergies"
        verbose_name_plural = "PreConsultation Allergies"

    def save(self, *args, **kwargs):
        self.section_code = "allergies"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Allergies | {self.pre_consultation.encounter.visit_pnr}"

class PreConsultationMedicalHistory(BasePreConsultationSection):
    class Meta:
        verbose_name = "PreConsultation Medical History"
        verbose_name_plural = "PreConsultation Medical Histories"

    def save(self, *args, **kwargs):
        self.section_code = "medical_history"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Medical History | {self.pre_consultation.encounter.visit_pnr}"


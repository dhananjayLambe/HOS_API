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
    is_completed = models.BooleanField(
        default=False,
        help_text="True when pre-consultation is marked complete"
    )
    is_skipped = models.BooleanField(
        default=False,
        help_text="True when doctor started consultation without completing pre-consultation"
    )
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
        if self.is_locked:
            return
        now = timezone.now()
        type(self).objects.filter(pk=self.pk, is_locked=False).update(
            is_locked=True,
            locked_at=now,
            lock_reason=reason or "Consultation started",
        )
        self.is_locked = True
        self.locked_at = now
        self.lock_reason = reason or "Consultation started"

    def mark_completed(self):
        self.is_completed = True
        self.completed_at = timezone.now()
        self.save(update_fields=["is_completed", "completed_at"])

    def save(self, *args, **kwargs):
        is_new = self._state.adding

        # 🔒 Prevent creating pre-consultation for completed/cancelled encounters
        if self.encounter.status in [
            "completed", "consultation_completed", "closed", "cancelled", "no_show"
        ]:
            from django.core.exceptions import ValidationError
            raise ValidationError(
                "Cannot create or modify pre-consultation for completed or inactive encounter."
            )

        # 🔒 Enforce strict OneToOne mapping (only raise if another row exists;
        # when creating, the reverse relation may already point to self)
        if is_new and hasattr(self.encounter, "pre_consultation"):
            existing = getattr(self.encounter, "pre_consultation", None)
            if existing is not None and existing is not self:
                from django.core.exceptions import ValidationError
                raise ValidationError(
                    "A pre-consultation already exists for this encounter."
                )

        # 🔒 Prevent modification if already locked in DB
        if not is_new and self.is_locked:
            from django.core.exceptions import ValidationError
            if type(self).objects.filter(pk=self.pk, is_locked=True).exists():
                raise ValidationError(
                    "Pre-consultation is locked and cannot be modified."
                )

        super().save(*args, **kwargs)

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

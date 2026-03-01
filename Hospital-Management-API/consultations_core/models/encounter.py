import uuid
from django.db import models
from django.db.models import Q
from doctor.models import doctor
from patient_account.models import PatientAccount, PatientProfile
from account.models import User
from appointments.models import Appointment
from django.core.exceptions import ValidationError


#250214-CL-00001-001 -> Consultation PNR <daily counter>-<CL>-<Clinic code>-<counter>
#to be added to Prescription PNR to prescription model
# prescription_pnr = models.CharField(
#     max_length=15, unique=True, db_index=True,
#     help_text="Format: YYMMDD-XXXX (daily counter)"
# )
#lifecycle of the encounter
# Encounter created → status=created
# PreConsultation locked → status=pre_consultation
# Consultation created → status=in_consultation
# Consultation finalized → status=completed
# Consultation cancelled → status=cancelled
# Consultation no show → status=no_show
# =====================================================
# 🔢 DAILY COUNTER (PNR BACKBONE)
# =====================================================

class EncounterDailyCounter(models.Model):
    """
    Maintains per-clinic per-day visit counter.
    Resets daily per clinic.
    """
    id = models.BigAutoField(primary_key=True, editable=False)
    clinic = models.ForeignKey(
        "clinic.Clinic",
        on_delete=models.CASCADE,
        related_name="daily_counters",
    )
    date = models.DateField()
    counter = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        unique_together = ("clinic", "date")
        verbose_name = "Encounter Daily Counter"
        verbose_name_plural = "Encounter Daily Counters"
        indexes = [
            models.Index(fields=["clinic", "date"])
        ]
    def __str__(self):
        return f"{self.clinic.code} - {self.date} → {self.counter}"

# =====================================================
# 🔑 ROOT MODEL — CLINICAL ENCOUNTER (SOURCE OF TRUTH)
# =====================================================
class ClinicalEncounter(models.Model):
    """
    One row = one OPD / clinical visit.
    Single source of truth for PNRs and visit lifecycle.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # 🔑 GLOBAL IDENTIFIERS (OPS-FRIENDLY)
    visit_pnr = models.CharField(
        max_length=30,
        unique=True,
        db_index=True,
        editable=False,
        help_text="Format: YYMMDD-CL-XXXXX-XXX",
    )
    # 👤 ACTORS
    doctor = models.ForeignKey(
        doctor, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="encounters"
    )
    clinic = models.ForeignKey(
        "clinic.Clinic",
        on_delete=models.CASCADE,
        related_name="encounters",
    )
    patient_account = models.ForeignKey(
        PatientAccount, on_delete=models.CASCADE,
        related_name="encounters"
    )
    patient_profile = models.ForeignKey(
        PatientProfile, on_delete=models.CASCADE,
        related_name="encounters"
    )

    appointment = models.ForeignKey(
        Appointment, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="encounters"
    )

    # 🏥 CONTEXT
    encounter_type = models.CharField(
        max_length=20,
        choices=[
            ("appointment", "Appointment"),
            ("walk_in", "Walk In"),
            ("emergency", "Emergency"),
            ("follow_up", "Follow Up"),
        ],
        default="walk_in"
    )

    status = models.CharField(
        max_length=40,
        choices=[
            ("created", "Created"),
            ("pre_consultation_in_progress", "Pre-Consultation In Progress"),
            ("pre_consultation_completed", "Pre-Consultation Completed"),
            ("consultation_in_progress", "Consultation In Progress"),
            ("consultation_completed", "Consultation Completed"),
            ("closed", "Closed"),
            ("cancelled", "Cancelled"),
            ("no_show", "No Show"),
            # Legacy (kept for existing rows)
            ("pre_consultation", "Pre Consultation"),
            ("in_consultation", "In Consultation"),
            ("completed", "Completed"),
        ],
        default="created"
    )

    # Workflow type (sync with Consultation.consultation_type; required if DB column exists)
    consultation_type = models.CharField(
        max_length=20,
        choices=[
            ("FULL", "Full Consultation"),
            ("QUICK_RX", "Quick Prescription"),
            ("TEST_ONLY", "Test Only Visit"),
        ],
        default="FULL",
        help_text="Workflow type governing visible sections and validation",
    )

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

    # 🔐 AUDIT & LIFECYCLE
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="encounters_created"
    )
    updated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="encounters_updated"
    )

    # ⏱ Required lifecycle timestamps (enterprise)
    check_in_time = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When patient checked in / encounter became active"
    )
    consultation_start_time = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When doctor started consultation"
    )
    consultation_end_time = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When consultation was finalized"
    )
    closed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When encounter was closed"
    )

    # Legacy (kept for backward compatibility)
    started_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when doctor starts consultation (use consultation_start_time)"
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when consultation is finalized (use consultation_end_time)"
    )
    cancelled_at = models.DateTimeField(null=True, blank=True, help_text="When encounter was cancelled")
    cancelled_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="encounters_cancelled",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Clinical Encounter"
        verbose_name_plural = "Clinical Encounters"
        constraints = [
            models.UniqueConstraint(
                fields=["patient_account", "clinic"],
                condition=Q(is_active=True),
                name="unique_active_encounter_per_patient_clinic"
            )
        ]

    def __str__(self):
        return f"Encounter {self.visit_pnr or '(no PNR)'}"
    def save(self, *args, **kwargs):
        # Only check existing row when updating (new instances have pk from default but no DB row yet)
        if self.pk and not self._state.adding:
            old = type(self).objects.only("visit_pnr", "clinic_id", "status").get(pk=self.pk)
            if old.visit_pnr and old.visit_pnr != self.visit_pnr:
                raise ValidationError("Visit PNR cannot be modified.")
            if old.clinic_id != self.clinic_id:
                raise ValidationError("Clinic cannot be changed after encounter creation.")
            if old.status != self.status:
                raise ValidationError(
                    "Direct status update is not allowed. Use EncounterStateMachine.transition()."
                )
        if not self.visit_pnr:
            if not self.clinic:
                raise ValidationError("Clinic is required to generate Visit PNR.")
            from consultations_core.services.visit_pnr_service import VisitPNRService
            self.visit_pnr = VisitPNRService.generate_pnr(self.clinic)
        super().save(*args, **kwargs)



class EncounterStatusLog(models.Model):
    encounter = models.ForeignKey(
        ClinicalEncounter,
        on_delete=models.CASCADE,
        related_name="status_logs"
    )
    from_status = models.CharField(max_length=40)
    to_status = models.CharField(max_length=40)
    changed_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-changed_at"]

    def __str__(self):
        return f"{self.encounter.visit_pnr} | {self.from_status} → {self.to_status}"

#  Final Architecture Summary (Lock This)

# ✔ UUID primary key
# ✔ visit_pnr = display ID
# ✔ One Encounter per visit
# ✔ One PreConsultation per encounter
# ✔ One Consultation per encounter
# ✔ Tests attached to Consultation
# ✔ Mode controls validation
# ✔ Strict status transition service
# ✔ PreConsultation auto-lock on consultation start
# ✔ Always reuse active encounter
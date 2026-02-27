import uuid
from django.db import models
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
        max_length=20,
        choices=[
            ("created", "Created"),
            ("pre_consultation", "Pre Consultation"),
            ("in_consultation", "In Consultation"),
            ("completed", "Completed"),
            ("cancelled", "Cancelled"),
            ("no_show", "No Show"),
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

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Clinical Encounter"
        verbose_name_plural = "Clinical Encounters"

    def __str__(self):
        return f"Encounter {self.visit_pnr or '(no PNR)'}"
    def save(self, *args, **kwargs):
        # Only check existing row when updating (new instances have pk from default but no DB row yet)
        if self.pk and not self._state.adding:
            old = type(self).objects.only("visit_pnr", "clinic_id").get(pk=self.pk)
            if old.visit_pnr and old.visit_pnr != self.visit_pnr:
                raise ValidationError("Visit PNR cannot be modified.")
            if old.clinic_id != self.clinic_id:
                raise ValidationError("Clinic cannot be changed after encounter creation.")
        if not self.visit_pnr:
            if not self.clinic:
                raise ValidationError("Clinic is required to generate Visit PNR.")
            from consultations_core.services.visit_pnr_service import VisitPNRService
            self.visit_pnr = VisitPNRService.generate_pnr(self.clinic)
        super().save(*args, **kwargs)


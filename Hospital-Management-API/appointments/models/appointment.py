#appointments/models/appointment.py
import uuid
from django.db import models
from django.db.models import Q
from django.utils import timezone
from account.models import User

class Appointment(models.Model):
    """Production-ready Appointment model (DoctorPro standard)"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # -------------------------
    # PATIENT INFO
    # -------------------------
    patient_account = models.ForeignKey(
        "patient_account.PatientAccount",
        on_delete=models.CASCADE,
        related_name="appointments"
    )
    patient_profile = models.ForeignKey(
        "patient_account.PatientProfile",
        on_delete=models.CASCADE,
        related_name="appointments"
    )

    # -------------------------
    # DOCTOR / CLINIC
    # -------------------------
    doctor = models.ForeignKey(
        "doctor.doctor",
        on_delete=models.CASCADE,
        related_name="appointments"
    )
    clinic = models.ForeignKey(
        "clinic.Clinic",
        on_delete=models.CASCADE,
        related_name="appointments"
    )

    # -------------------------
    # SLOT MANAGEMENT (CRITICAL)
    # -------------------------
    appointment_date = models.DateField()
    slot_start_time = models.TimeField()
    slot_end_time = models.TimeField()

    # -------------------------
    # STATUS MANAGEMENT
    # -------------------------
    STATUS_CHOICES = [
        ("scheduled", "Scheduled"),
        ("checked_in", "Checked In"),
        ("in_consultation", "In Consultation"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
        ("no_show", "No Show"),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="scheduled")

    # -------------------------
    # CHECK-IN SUPPORT
    # -------------------------
    check_in_time = models.DateTimeField(null=True, blank=True)

    # -------------------------
    # PAYMENT (FUTURE SAFE)
    # -------------------------
    PAYMENT_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("paid", "Paid"),
        ("failed", "Failed"),
        ("refunded", "Refunded"),
    ]
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default="pending")

    payment_mode = models.CharField(
        max_length=10,
        choices=[("cash", "Cash"), ("online", "Online")],
        default="cash"
    )

    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    # -------------------------
    # CONSULTATION MODE
    # -------------------------
    consultation_mode = models.CharField(
        max_length=10,
        choices=[("clinic", "Clinic"), ("video", "Video")],
        default="clinic"
    )

    # -------------------------
    # BOOKING SOURCE
    # -------------------------
    booking_source = models.CharField(
        max_length=10,
        choices=[("online", "Online"), ("walk_in", "Walk-in")],
        default="online"
    )

    # -------------------------
    # APPOINTMENT TYPE
    # -------------------------
    appointment_type = models.CharField(
        max_length=20,
        choices=[("new", "New"), ("follow_up", "Follow-up")],
        default="new"
    )

    previous_appointment = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="follow_ups"
    )

    notes = models.TextField(blank=True, null=True)

    # -------------------------
    # AUDIT (VERY IMPORTANT)
    # -------------------------
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_appointments"
    )

    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_appointments"
    )

    # -------------------------
    # TIMESTAMPS
    # -------------------------
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def encounter(self):
        """Encounter for this appointment (``ClinicalEncounter.appointment`` FK)."""
        return self.encounters.first()

    # -------------------------
    # META (PERFORMANCE + SAFETY)
    # -------------------------
    class Meta:
        indexes = [
            models.Index(
                fields=["doctor", "appointment_date"],
                name="appt_doctor_date_idx",
            ),
            models.Index(
                fields=["clinic", "appointment_date"],
                name="appt_clinic_date_idx",
            ),
            models.Index(fields=["status"], name="appt_status_idx"),
            models.Index(fields=["patient_profile"], name="appt_patient_profile_idx"),
        ]

        constraints = [
            models.UniqueConstraint(
                fields=["doctor", "appointment_date", "slot_start_time"],
                name="unique_active_doctor_slot",
                condition=Q(
                    status__in=["scheduled", "checked_in", "in_consultation"]
                ),
            ),
        ]

    def __str__(self):
        return (
            f"{self.patient_profile} | Dr.{self.doctor} | "
            f"{self.appointment_date} {self.slot_start_time}"
        )

class AppointmentHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    appointment = models.ForeignKey(
        "appointments.Appointment",
        on_delete=models.CASCADE,
        related_name="history"
    )
    status = models.CharField(max_length=20, choices=Appointment.STATUS_CHOICES)
    changed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    comment = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.appointment_id} - {self.status}"

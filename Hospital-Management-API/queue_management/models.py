import uuid
from django.db import models
from datetime import timedelta
from doctor.models import doctor
from clinic.models import Clinic
from patient_account.models import PatientAccount, PatientProfile
from appointments.models import Appointment


class Queue(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)  # Use UUIDField as the new primary key
    doctor = models.ForeignKey(doctor, on_delete=models.CASCADE, related_name="queues", null=True, blank=True)
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name="queues", default=None)
    patient_account = models.ForeignKey(PatientAccount, on_delete=models.CASCADE, related_name="queues", null=True, blank=True)
    patient = models.ForeignKey(PatientProfile, on_delete=models.CASCADE, related_name="queue")
    appointment = models.OneToOneField(Appointment, on_delete=models.CASCADE, related_name="queue", null=True, blank=True)
    
    encounter = models.ForeignKey(
        'consultations_core.ClinicalEncounter',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='queue_entries',
    )

    status = models.CharField(max_length=20, choices=[
        ('waiting', 'Waiting'),
        ('vitals_done', 'Vitals Done'),
        ('in_consultation', 'In Consultation'),
        ('completed', 'Completed'),
        ('skipped', 'Skipped'),
        ('cancelled', 'Cancelled')
    ], default='waiting')

    check_in_time = models.DateTimeField(auto_now_add=True)
    #wait_time_estimated = models.DurationField(default=timedelta(minutes=0))
    estimated_wait_time = models.DurationField(default=timedelta(minutes=0))
    position_in_queue = models.PositiveIntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        indexes = [
            models.Index(fields=["clinic", "doctor", "status"]),
            models.Index(fields=["appointment"]),
            models.Index(fields=["clinic", "position_in_queue"]),
            models.Index(fields=["encounter", "created_at"]),
        ]
    def __str__(self):
        return f"{self.patient.first_name} - {self.status}"


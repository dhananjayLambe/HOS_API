import uuid
import random
from django.db import models
from django.utils import timezone
from doctor.models import doctor
from patient_account.models import PatientAccount, PatientProfile
from utils.static_data_service import StaticDataService
from account.models import User
from appointments.models import Appointment


class Consultation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    consultation_pnr = models.CharField(max_length=10, unique=True, editable=False, db_index=True)
    prescription_pnr = models.CharField(max_length=10, unique=True, editable=False, db_index=True)

    doctor = models.ForeignKey(doctor, on_delete=models.CASCADE, related_name="consultations")
    patient_account = models.ForeignKey(PatientAccount, on_delete=models.CASCADE, related_name="consultations")
    patient_profile = models.ForeignKey(PatientProfile, on_delete=models.CASCADE, related_name="consultations")

    closure_note = models.TextField(blank=True, null=True)
    follow_up_date = models.DateField(blank=True, null=True)
    is_finalized = models.BooleanField(default=False)
    prescription_pdf = models.FileField(upload_to="prescriptions/", blank=True, null=True,max_length=255)

    tag = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        choices=StaticDataService.get_consultation_tag_choices(),
        help_text="Optional tag like Follow-Up, Critical, etc."
    )
    is_important = models.BooleanField(default=False, help_text="Mark consultation as important")

    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    appointment = models.ForeignKey(Appointment, 
                        on_delete=models.SET_NULL, 
                        null=True, blank=True, 
                        related_name="consultations")
    class Meta:
        ordering = ['-started_at']
        verbose_name = "Consultation"
        verbose_name_plural = "Consultations"

    def __str__(self):
        return f"Consultation PNR: {self.consultation_pnr} | Patient: {self.patient_profile.first_name}"

    def save(self, *args, **kwargs):
        if not self.consultation_pnr:
            self.consultation_pnr = self.generate_unique_consultation_pnr()
        if not self.prescription_pnr:
            self.prescription_pnr = self.generate_unique_prescription_pnr()
        super().save(*args, **kwargs)

    @staticmethod
    def generate_unique_consultation_pnr():
        while True:
            pnr = str(random.randint(1000000000, 9999999999))  # 10-digit number
            if not Consultation.objects.filter(consultation_pnr=pnr).exists():
                return pnr

    @staticmethod
    def generate_unique_prescription_pnr():
        while True:
            pnr = str(random.randint(1000000000, 9999999999))  # 10-digit number
            if not Consultation.objects.filter(prescription_pnr=pnr).exists():
                return pnr

class Vitals(models.Model):
    consultation = models.OneToOneField(Consultation, on_delete=models.CASCADE, related_name="vitals")
    height_cm = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    weight_kg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    pulse = models.IntegerField(null=True, blank=True)
    blood_pressure = models.CharField(max_length=10, blank=True)  # e.g. 120/80
    temperature_c = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)

class Complaint(models.Model):
    SEVERITY_CHOICES = [
        ('mild', 'Mild'),
        ('moderate', 'Moderate'),
        ('severe', 'Severe')
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    consultation = models.ForeignKey(Consultation, on_delete=models.CASCADE, related_name='complaints')

    complaint_text = models.CharField(max_length=255)
    duration = models.PositiveIntegerField(help_text="Duration in days")
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES)
    is_general = models.BooleanField(default=False)  # Whether selected from general complaints list
    doctor_note = models.TextField(blank=True, null=True)  # Optional note field

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = "Complaint"
        verbose_name_plural = "Complaints"
        unique_together = ('consultation', 'complaint_text')

    def __str__(self):
        return f"{self.complaint_text} ({self.severity})"

class Diagnosis(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    consultation = models.ForeignKey(Consultation, on_delete=models.CASCADE, related_name='diagnoses')

    code = models.CharField(max_length=20, blank=True, null=True, help_text="ICD-10/11 code (optional)")
    description = models.CharField(max_length=500, help_text="Diagnosis description")

    location = models.CharField(
        max_length=20, 
        choices=StaticDataService.get_location_choices(),
        blank=True, 
        null=True,
        help_text="Diagnosis location in body"
    )
    diagnosis_type = models.CharField(
        max_length=20, 
        choices=StaticDataService.get_diagnosis_type_choices(),
        default='confirmed',
        help_text="Type of diagnosis"
    )

    is_general = models.BooleanField(default=False, help_text="Selected from predefined general diagnosis list")
    doctor_note = models.TextField(blank=True, null=True, help_text="Internal notes for doctor")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = "Diagnosis"
        verbose_name_plural = "Diagnoses"

    def __str__(self):
        return f"{self.description} ({self.diagnosis_type})"

class AdviceTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    description = models.CharField(max_length=500, unique=True, help_text="Predefined lifestyle/dietary advice")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = "Advice Template"
        verbose_name_plural = "Advice Templates"

    def __str__(self):
        return f"Template: {self.description}"

class Advice(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    consultation = models.ForeignKey(Consultation, on_delete=models.CASCADE, related_name='advices')
    advice_templates = models.ManyToManyField(AdviceTemplate, blank=True, related_name='custom_advices')
    custom_advice = models.TextField(blank=True, null=True, help_text="Custom lifestyle/dietary advice")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering = ['created_at']
        verbose_name = "Advice"
        verbose_name_plural = "Advices"
        constraints = [
        models.UniqueConstraint(
            fields=['consultation', 'custom_advice'],
            name='unique_custom_advice_per_consultation'
            )
        ]

    def __str__(self):
        return f"Advice for Consultation {self.consultation.id}"

class PatientFeedback(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    consultation = models.OneToOneField(Consultation, on_delete=models.CASCADE, related_name='patient_feedback')

    rating = models.IntegerField(
        choices=[(i, str(i)) for i in range(1, 6)],
        help_text="Rating from 1 to 5"
    )
    comments = models.TextField(blank=True, null=True, help_text="Optional comment by patient")
    is_anonymous = models.BooleanField(default=False, help_text="Hide patient's identity if True")

    created_at = models.DateTimeField(auto_now_add=True)

    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='feedbacks_created'
    )

    class Meta:
        verbose_name = "Patient Feedback"
        verbose_name_plural = "Patient Feedbacks"
        ordering = ['-created_at']

    def __str__(self):
        return f"Feedback for Consultation {self.consultation.consultation_pnr} - Rating {self.rating}"
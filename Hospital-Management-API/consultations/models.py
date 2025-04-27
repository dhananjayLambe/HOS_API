import uuid
import random
from django.db import models
from django.utils import timezone
from doctor.models import doctor
from patient_account.models import PatientAccount, PatientProfile


class Consultation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    consultation_pnr = models.CharField(max_length=10, unique=True, editable=False, db_index=True)
    prescription_pnr = models.CharField(max_length=10, unique=True, editable=False, db_index=True)

    doctor = models.ForeignKey(doctor, on_delete=models.CASCADE, related_name="consultations")
    patient_account = models.ForeignKey(PatientAccount, on_delete=models.CASCADE, related_name="consultations")
    patient_profile = models.ForeignKey(PatientProfile, on_delete=models.CASCADE, related_name="consultations")

    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

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


# class Complaint(models.Model):
#     consultation = models.ForeignKey(Consultation, on_delete=models.CASCADE, related_name="complaints")
#     description = models.TextField()
#     created_at = models.DateTimeField(auto_now_add=True)

# class Diagnosis(models.Model):
#     consultation = models.ForeignKey(Consultation, on_delete=models.CASCADE, related_name="diagnoses")
#     name = models.CharField(max_length=255)
#     notes = models.TextField(blank=True, null=True)

# class Prescription(models.Model):
#     consultation = models.ForeignKey(Consultation, on_delete=models.CASCADE, related_name="prescriptions")
#     medicine_name = models.CharField(max_length=255)
#     dosage = models.CharField(max_length=255)
#     frequency = models.CharField(max_length=100)  # e.g. "1-0-1"
#     duration = models.CharField(max_length=100)  # e.g. "5 days"
#     notes = models.TextField(blank=True, null=True)

# class Advice(models.Model):
#     consultation = models.ForeignKey(Consultation, on_delete=models.CASCADE, related_name="advices")
#     note = models.TextField()

# class LabTest(models.Model):
#     consultation = models.ForeignKey(Consultation, on_delete=models.CASCADE, related_name="lab_tests")
#     test_name = models.CharField(max_length=255)
#     notes = models.TextField(blank=True, null=True)
#     is_done = models.BooleanField(default=False)
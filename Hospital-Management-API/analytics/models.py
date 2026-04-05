from django.db import models
import uuid
# Create your models here.
class DoctorMedicineUsage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(
        "account.User",
        on_delete=models.CASCADE,
        related_name="doctor_medicine_usages",
    )
    drug = models.ForeignKey("medicines.DrugMaster", on_delete=models.CASCADE)

    usage_count = models.PositiveIntegerField(default=0)
    last_used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="doctor_medicine_usages_soft_deleted",
    )
    class Meta:
        unique_together = ("doctor", "drug")
        indexes = [
            models.Index(fields=["doctor", "drug"]),
        ]
    def __str__(self):
        return f"{self.doctor.get_name} - {self.drug.brand_name}"

class DiagnosisMedicineMap(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    diagnosis = models.ForeignKey(
        "consultations_core.DiagnosisMaster",
        on_delete=models.CASCADE,
        related_name="medicine_maps",
    )
    drug = models.ForeignKey("medicines.DrugMaster", on_delete=models.CASCADE)

    weight = models.FloatField(default=1.0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    class Meta:
        indexes = [
            models.Index(fields=["diagnosis"]),
        ]
    def __str__(self):
        return f"{self.diagnosis.label} - {self.drug.brand_name}"
class PatientMedicineUsage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient_id = models.UUIDField()
    drug = models.ForeignKey("medicines.DrugMaster", on_delete=models.CASCADE)

    usage_count = models.PositiveIntegerField(default=0)
    last_used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    class Meta:
        unique_together = ("patient_id", "drug")
        indexes = [
            models.Index(fields=["patient_id"]),
        ]
    def __str__(self):
        return f"{self.patient_id} - {self.drug.brand_name}"
import uuid
from django.db import models
from account.models import User
from consultations.models import Consultation
from utils.static_data_service import StaticDataService
from django.db.models import JSONField

class Prescription(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    consultation = models.ForeignKey(Consultation, on_delete=models.CASCADE, related_name='prescriptions')

    drug_name = models.CharField(max_length=255)
    medicine_type = models.CharField(
        max_length=30,
        choices=StaticDataService.get_medicine_type_choices(),
        help_text="e.g., tablet, syrup, cream, drops"
    )
    strength = models.CharField(max_length=100, help_text="E.g., 500mg, 125mg/5ml")
    dosage_amount = models.DecimalField(max_digits=5, decimal_places=2, help_text="How much to take per dose")
    dosage_unit = models.CharField(
        max_length=20,
        choices=StaticDataService.get_dosage_unit_choices(),
        help_text="E.g., tablets, ml, g, sprays"
    )
    duration_type = models.CharField(
        max_length=10,
        choices=StaticDataService.get_duration_type_choices(),
        default='fixed',
        help_text="Fixed duration, STAT (take immediately), or SOS (as needed)"
    )    
    frequency_per_day = models.IntegerField(
        help_text="How many times a day the medicine should be taken (e.g., 1, 2, 3)"
    )
    # timing_schedule = models.CharField(
    #     max_length=50,
    #     choices=StaticDataService.get_timing_choices(),
    #     help_text="When to take it: before food, after lunch, at night, etc."
    # )
    timing_schedule = JSONField(
    help_text="List of timings: e.g., ['before_breakfast', 'after_lunch', 'bedtime']"
    ) 
    duration_in_days = models.PositiveIntegerField(help_text="For how many days the medicine should be taken")

    total_quantity_required = models.DecimalField(
        max_digits=6, decimal_places=2, blank=True, null=True,
        help_text="Calculated total quantity to complete course (e.g., total tablets or ml)"
    )

    instructions = models.TextField(
        blank=True,
        null=True,
        help_text="Any special instructions to the patient"
    )
    interaction_warning = models.TextField(
        blank=True,
        null=True,
        help_text="Warnings about drug interactions"
    )
    status = models.CharField(
        max_length=20,
        choices=StaticDataService.get_prescription_status_choices(),
        default='active'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(User, related_name='created_prescriptions', on_delete=models.SET_NULL, null=True)
    updated_by = models.ForeignKey(User, related_name='updated_prescriptions', on_delete=models.SET_NULL, null=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Prescription"
        verbose_name_plural = "Prescriptions"

    def __str__(self):
        return f"{self.drug_name} - {self.consultation.consultation_pnr}"

    def save(self, *args, **kwargs):
        # Auto-calculate total quantity needed for the full course
        if self.dosage_amount and self.frequency_per_day and self.duration_in_days:
            try:
                self.total_quantity_required = self.dosage_amount * self.frequency_per_day * self.duration_in_days
            except:
                self.total_quantity_required = None
        super().save(*args, **kwargs)

# ✅ Supports:
# 	•	Tablets (e.g., 1 tablet, ½ tablet)
# 	•	Syrups (e.g., 10 ml x 3 times a day for 5 days)
# 	•	Creams (e.g., apply twice daily)
# 	•	Interaction warnings
# 	•	Instructions
# 	•	Duration in days
# 	•	Frequency and timing
# 	•	Audit trail (created_by, updated_by)
# 	•	Auto-calculated total_quantity_required
# consultation_core/models/clinical_templates.py

import uuid
from django.db import models


class ClinicalTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    doctor = models.ForeignKey(
        "doctor.doctor",
        on_delete=models.CASCADE,
        related_name="clinical_templates"
    )

    name = models.CharField(max_length=255)

    consultation_type = models.CharField(
        max_length=20,
        choices=[
            ("FULL", "Full Consultation"),
            ("QUICK_RX", "Quick Prescription"),
            ("TEST_ONLY", "Tests Only"),
        ]
    )

    # Core reusable data
    template_data = models.JSONField()

    # Optional future use
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "clinical_templates"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["doctor"]),
            models.Index(fields=["consultation_type"]),
        ]
        unique_together = ("doctor", "name")

    def __str__(self):
        return f"{self.name} - Doctor:{self.doctor_id}"
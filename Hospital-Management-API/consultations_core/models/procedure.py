"""
Procedures Model (Phase 1 - Minimal)

Stores free-text procedures linked to consultation.
Future-ready for extension.
"""

from django.db import models
import uuid
from account.models import User


class Procedure(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Core linkage
    consultation = models.ForeignKey(
        "consultations_core.Consultation",
        on_delete=models.CASCADE,
        related_name="procedures"
    )

    # Phase 1: free text only
    notes = models.TextField(
        blank=True,
        help_text="Free text procedures (e.g., Dressing done, Suturing 3 stitches)"
    )

    # Audit
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="procedures_created"
    )
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="procedures_updated"
    )

    # System
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "consultation_procedures"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Procedure - {self.consultation_id}"
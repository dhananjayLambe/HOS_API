# consultations_core/models/audit.py

from django.db import models
import uuid


class AuditSource(models.TextChoices):
    SYSTEM = "system", "System"
    DOCTOR = "doctor", "Doctor"
    HELPDESK = "helpdesk", "Helpdesk"
    PATIENT = "patient", "Patient"
    ADMIN = "admin", "Admin"


class ClinicalAuditLog(models.Model):
    """
    Enterprise-grade lifecycle audit log.

    Tracks:
    - Status transitions
    - Finalization events
    - Lock/unlock events
    - Future workflow transitions

    Immutable. No updates allowed.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # 🔗 Object Reference
    object_type = models.CharField(
        max_length=100,
        db_index=True,
        help_text="Model name (e.g. ClinicalEncounter, Consultation)"
    )

    object_id = models.UUIDField(
        db_index=True,
        help_text="Primary key of the object"
    )

    # 📌 Field Tracking
    field_name = models.CharField(
        max_length=100,
        db_index=True,
        help_text="Field that changed (e.g. status, is_finalized)"
    )

    old_value = models.CharField(
        max_length=255,
        null=True,
        blank=True
    )

    new_value = models.CharField(
        max_length=255
    )

    # 👤 Actor
    changed_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    source = models.CharField(
        max_length=30,
        choices=AuditSource.choices,
        default=AuditSource.SYSTEM
    )

    reason = models.TextField(
        null=True,
        blank=True,
        help_text="Optional reason for status change"
    )

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["object_type", "object_id"]),
            models.Index(fields=["field_name"]),
            models.Index(fields=["created_at"]),
        ]

        verbose_name = "Clinical Audit Log"
        verbose_name_plural = "Clinical Audit Logs"

    def save(self, *args, **kwargs):
        if self.pk and not self._state.adding:
            raise Exception("Audit logs are immutable and cannot be modified.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise Exception("Audit logs cannot be deleted.")

import uuid

from django.core.exceptions import ValidationError
from django.db import models

from .catalog import DiagnosticServiceMaster
from .choices import OrderStatus
from .providers import DiagnosticProviderBranch


class DiagnosticOrder(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    order_number = models.CharField(max_length=20, unique=True)

    encounter = models.ForeignKey(
        "consultations_core.ClinicalEncounter",
        on_delete=models.PROTECT,
        related_name="diagnostic_orders",
    )

    patient_profile = models.ForeignKey(
        "patient_account.PatientProfile",
        on_delete=models.PROTECT,
        related_name="diagnostic_orders",
    )

    doctor = models.ForeignKey(
        "doctor.doctor",
        on_delete=models.PROTECT,
        related_name="diagnostic_orders",
    )

    branch = models.ForeignKey(
        DiagnosticProviderBranch,
        on_delete=models.PROTECT,
        related_name="orders",
    )

    status = models.CharField(
        max_length=30,
        choices=OrderStatus.choices,
        default=OrderStatus.CREATED,
    )
    source = models.CharField(
        max_length=20,
        choices=[
            ("emr", "From EMR"),
            ("app", "From Patient App"),
            ("admin", "Manual/Admin"),
            ("api", "External API"),
        ],
        default="emr",
        db_index=True,
    )

    total_amount_snapshot = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    accepted_by_lab = models.BooleanField(default=False)
    accepted_at = models.DateTimeField(null=True, blank=True)

    sample_collection_mode = models.CharField(
        max_length=20,
        choices=[
            ("home", "Home Collection"),
            ("lab", "Visit Lab"),
        ],
        default="lab",
    )

    scheduled_at = models.DateTimeField(null=True, blank=True)
    collected_at = models.DateTimeField(null=True, blank=True)
    processing_started_at = models.DateTimeField(null=True, blank=True)
    report_ready_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_reason = models.TextField(blank=True, null=True)
    cancelled_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnostic_orders_cancelled",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnostic_orders_created",
    )
    updated_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnostic_orders_updated",
    )

    class Meta:
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["branch"]),
            models.Index(fields=["encounter"]),
            models.Index(fields=["source"]),
        ]

    def update_status(self, new_status, user=None, source="system", reason=None):
        allowed_transitions = {
            OrderStatus.CREATED: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
            OrderStatus.CONFIRMED: [OrderStatus.SAMPLE_COLLECTED, OrderStatus.CANCELLED],
            OrderStatus.SAMPLE_COLLECTED: [OrderStatus.IN_PROCESSING],
            OrderStatus.IN_PROCESSING: [OrderStatus.REPORT_READY],
            OrderStatus.REPORT_READY: [OrderStatus.COMPLETED],
        }

        if new_status not in allowed_transitions.get(self.status, []):
            raise ValidationError("Invalid order status transition.")

        old_status = self.status
        self.status = new_status
        self.save(update_fields=["status"])

        from consultations_core.domain.audit import AuditService

        AuditService.log_status_change(
            instance=self,
            field_name="status",
            old_value=old_status,
            new_value=new_status,
            user=user,
            source=source,
            reason=reason,
        )

    def __str__(self):
        return self.order_number


class DiagnosticOrderItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    order = models.ForeignKey(
        DiagnosticOrder,
        on_delete=models.CASCADE,
        related_name="items",
    )

    service = models.ForeignKey(
        DiagnosticServiceMaster,
        on_delete=models.PROTECT,
    )

    name_snapshot = models.CharField(max_length=255)
    price_snapshot = models.DecimalField(max_digits=10, decimal_places=2)
    platform_earning_snapshot = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    doctor_earning_snapshot = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    lab_payout_snapshot = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnostic_order_items_deleted",
    )
    recommendation_source = models.CharField(
        max_length=20,
        choices=[
            ("manual", "Doctor Manual"),
            ("diagnosis_map", "Diagnosis Suggested"),
            ("bundle", "Bundle Suggested"),
            ("ai", "AI Suggested"),
        ],
        default="manual",
    )
    diagnosis = models.ForeignKey(
        "consultations_core.ConsultationDiagnosis",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    diagnosis_snapshot = models.CharField(max_length=255, null=True, blank=True)
    bundle = models.ForeignKey(
        "diagnostics_engine.DiagnosticBundle",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    bundle_snapshot = models.CharField(max_length=255, null=True, blank=True)
    ai_confidence_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    ai_reference = models.UUIDField(null=True, blank=True)
    ai_snapshot = models.CharField(max_length=255, null=True, blank=True)
    ai_generated = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if self.pk:
            if self.order.status != OrderStatus.CREATED:
                raise ValidationError("Cannot modify items after order confirmation.")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name_snapshot} - {self.order.order_number}"


__all__ = [
    "DiagnosticOrder",
    "DiagnosticOrderItem",
]

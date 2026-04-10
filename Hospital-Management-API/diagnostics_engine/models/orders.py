import uuid

from django.core.exceptions import ValidationError
from django.db import models

from .catalog import DiagnosticPackage, DiagnosticServiceMaster
from .choices import ExecutionType, OrderLineType, OrderStatus, OrderTestLineStatus
from .providers import DiagnosticProviderBranch


class DiagnosticOrder(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    order_number = models.CharField(max_length=20, unique=True)

    encounter = models.ForeignKey(
        "consultations_core.ClinicalEncounter",
        on_delete=models.PROTECT,
        related_name="diagnostic_orders",
    )

    consultation = models.ForeignKey(
        "consultations_core.Consultation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
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
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    final_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

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
            models.Index(fields=["consultation"]),
        ]

    def update_status(self, new_status, user=None, source="system", reason=None):
        allowed_transitions = {
            OrderStatus.CREATED: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
            OrderStatus.CONFIRMED: [OrderStatus.SAMPLE_COLLECTED, OrderStatus.CANCELLED],
            OrderStatus.SAMPLE_COLLECTED: [OrderStatus.IN_PROCESSING],
            OrderStatus.IN_PROCESSING: [
                OrderStatus.REPORT_READY,
                OrderStatus.PARTIAL,
                OrderStatus.CANCELLED,
                OrderStatus.COMPLETED,
            ],
            OrderStatus.REPORT_READY: [OrderStatus.COMPLETED, OrderStatus.PARTIAL],
            OrderStatus.PARTIAL: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
            OrderStatus.COMPLETED: [],
            OrderStatus.CANCELLED: [],
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

        if new_status == OrderStatus.CONFIRMED:
            from diagnostics_engine.domain.package_orders import (
                ensure_test_lines_for_test_items,
                expand_confirmed_order_packages,
            )

            expand_confirmed_order_packages(self, user)
            ensure_test_lines_for_test_items(self, user)

    def __str__(self):
        return self.order_number


class DiagnosticOrderItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    order = models.ForeignKey(
        DiagnosticOrder,
        on_delete=models.CASCADE,
        related_name="items",
    )

    line_type = models.CharField(
        max_length=20,
        choices=OrderLineType.choices,
        default=OrderLineType.TEST,
    )

    service = models.ForeignKey(
        DiagnosticServiceMaster,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )

    diagnostic_package = models.ForeignKey(
        DiagnosticPackage,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="order_items",
    )

    package_version_snapshot = models.PositiveIntegerField(null=True, blank=True)
    composition_snapshot = models.JSONField(blank=True, null=True)
    is_price_derived = models.BooleanField(default=False)

    name_snapshot = models.CharField(max_length=255)
    price_snapshot = models.DecimalField(max_digits=10, decimal_places=2)
    platform_earning_snapshot = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    doctor_earning_snapshot = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    lab_payout_snapshot = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnostic_order_items_created",
    )
    updated_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnostic_order_items_updated",
    )
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
            ("package", "Package Suggested"),
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
    ai_confidence_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    ai_reference = models.UUIDField(null=True, blank=True)
    ai_snapshot = models.CharField(max_length=255, null=True, blank=True)
    ai_generated = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(line_type=OrderLineType.TEST, service__isnull=False, diagnostic_package__isnull=True)
                    | models.Q(
                        line_type=OrderLineType.PACKAGE,
                        diagnostic_package__isnull=False,
                        service__isnull=True,
                    )
                ),
                name="order_item_line_type_fk_valid",
            ),
        ]
        indexes = [
            models.Index(fields=["order"]),
            models.Index(fields=["line_type"]),
            models.Index(fields=["diagnostic_package"]),
        ]

    def clean(self):
        if self.line_type == OrderLineType.TEST and not self.service_id:
            raise ValidationError("Test lines require a service.")
        if self.line_type == OrderLineType.PACKAGE and not self.diagnostic_package_id:
            raise ValidationError("Package lines require diagnostic_package.")

    def save(self, *args, **kwargs):
        if self.pk:
            if self.order.status != OrderStatus.CREATED:
                raise ValidationError("Cannot modify items after order confirmation.")
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name_snapshot} - {self.order.order_number}"


class DiagnosticOrderTestLine(models.Model):
    """Queryable execution row per service (lab or imaging)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    order = models.ForeignKey(
        DiagnosticOrder,
        on_delete=models.CASCADE,
        related_name="test_lines",
    )
    order_item = models.ForeignKey(
        DiagnosticOrderItem,
        on_delete=models.CASCADE,
        related_name="test_lines",
    )
    service = models.ForeignKey(
        DiagnosticServiceMaster,
        on_delete=models.PROTECT,
        related_name="order_test_lines",
    )

    status = models.CharField(
        max_length=30,
        choices=OrderTestLineStatus.choices,
        default=OrderTestLineStatus.PENDING,
    )

    execution_type = models.CharField(
        max_length=30,
        choices=ExecutionType.choices,
        default=ExecutionType.BRANCH_VISIT,
    )

    instructions = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnostic_order_test_lines_created",
    )
    updated_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnostic_order_test_lines_updated",
    )

    class Meta:
        indexes = [
            models.Index(fields=["order"]),
            models.Index(fields=["order_item"]),
            models.Index(fields=["service"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"{self.service} ({self.status})"


__all__ = [
    "DiagnosticOrder",
    "DiagnosticOrderItem",
    "DiagnosticOrderTestLine",
]

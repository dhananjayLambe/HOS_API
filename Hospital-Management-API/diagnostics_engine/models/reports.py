import uuid

from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils import timezone

from .choices import OrderStatus, ReportLifecycleStatus, ReportStorageMode
from .orders import DiagnosticOrder, DiagnosticOrderTestLine


class DiagnosticReport(models.Model):
    """Optional rollup / legacy single report per order (older flows)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    order = models.OneToOneField(
        DiagnosticOrder,
        on_delete=models.CASCADE,
        related_name="report",
        null=True,
        blank=True,
    )

    storage_mode = models.CharField(
        max_length=20,
        choices=ReportStorageMode.choices,
        default=ReportStorageMode.STRUCTURED,
    )

    structured_result = models.JSONField(blank=True, null=True)
    file = models.FileField(upload_to="diagnostic_reports/", null=True, blank=True)

    status = models.CharField(
        max_length=20,
        choices=ReportLifecycleStatus.choices,
        default=ReportLifecycleStatus.PENDING,
    )
    uploaded_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnostic_reports_uploaded",
    )

    is_editable = models.BooleanField(default=True)

    uploaded_at = models.DateTimeField(auto_now_add=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    delivered_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnostic_reports_delivered",
    )
    delivered_reason = models.TextField(blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnostic_reports_deleted",
    )

    class Meta:
        indexes = [
            models.Index(fields=["status"]),
        ]

    def save(self, *args, **kwargs):
        with transaction.atomic():
            old_status = None
            if self.pk:
                old = type(self).objects.only("is_editable", "status").get(pk=self.pk)
                if not old.is_editable:
                    raise ValidationError("Report locked.")
                old_status = old.status

            super().save(*args, **kwargs)

            if self.order_id and not self.order.test_lines.exists():
                from diagnostics_engine.domain.order_status import OrderStatusAggregationService

                if self.status == ReportLifecycleStatus.READY:
                    OrderStatusAggregationService.sync_from_legacy_report(
                        self.order, ReportLifecycleStatus.READY
                    )
                elif self.status == ReportLifecycleStatus.DELIVERED:
                    self.delivered_at = timezone.now()
                    self.is_editable = False
                    super().save(update_fields=["delivered_at", "is_editable", "updated_at"])
                    OrderStatusAggregationService.sync_from_legacy_report(
                        self.order, ReportLifecycleStatus.DELIVERED
                    )

            if old_status is not None and old_status != self.status:
                from consultations_core.domain.audit import AuditService

                AuditService.log_status_change(
                    instance=self,
                    field_name="status",
                    old_value=old_status,
                    new_value=self.status,
                    user=None,
                    source="system",
                    reason=None,
                )

    def allow_admin_edit(self):
        self.is_editable = True
        self.save(update_fields=["is_editable"])

    def __str__(self):
        return f"Report - {self.order_id or 'no-order'}"


class DiagnosticTestReport(models.Model):
    """Per–test-line report (preferred for multi-test / package orders)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    order_test_line = models.OneToOneField(
        DiagnosticOrderTestLine,
        on_delete=models.CASCADE,
        related_name="test_report",
    )

    storage_mode = models.CharField(
        max_length=20,
        choices=ReportStorageMode.choices,
        default=ReportStorageMode.STRUCTURED,
    )
    structured_result = models.JSONField(blank=True, null=True)
    file = models.FileField(upload_to="diagnostic_test_reports/", null=True, blank=True)

    status = models.CharField(
        max_length=20,
        choices=ReportLifecycleStatus.choices,
        default=ReportLifecycleStatus.PENDING,
    )

    is_editable = models.BooleanField(default=True)

    uploaded_at = models.DateTimeField(auto_now_add=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    uploaded_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnostic_test_reports_uploaded",
    )
    delivered_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnostic_test_reports_delivered",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnostic_test_reports_deleted",
    )

    class Meta:
        indexes = [
            models.Index(fields=["status"]),
        ]

    def save(self, *args, **kwargs):
        with transaction.atomic():
            old_status = None
            if self.pk:
                old = type(self).objects.only("is_editable", "status").get(pk=self.pk)
                if not old.is_editable:
                    raise ValidationError("Report locked.")
                old_status = old.status

            super().save(*args, **kwargs)

            from diagnostics_engine.domain.order_status import OrderStatusAggregationService

            OrderStatusAggregationService.sync_from_test_reports(self.order_test_line.order)

            if old_status is not None and old_status != self.status:
                from consultations_core.domain.audit import AuditService

                AuditService.log_status_change(
                    instance=self,
                    field_name="status",
                    old_value=old_status,
                    new_value=self.status,
                    user=None,
                    source="system",
                    reason=None,
                )

    def __str__(self):
        return f"TestReport - {self.order_test_line_id}"


__all__ = [
    "DiagnosticReport",
    "DiagnosticTestReport",
]

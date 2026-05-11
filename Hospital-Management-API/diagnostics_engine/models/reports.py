import uuid

from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils import timezone

from .choices import OrderStatus, ReportLifecycleStatus, ReportStorageMode
from .orders import DiagnosticOrder, DiagnosticOrderTestLine

# =========================================================
# DIAGNOSTIC REPORT DOMAIN
# =========================================================
# This module handles diagnostic result persistence.
#
# Two reporting architectures exist:
#
# 1. DiagnosticReport
#    Legacy / order-level reporting.
#    One report per order.
#
# 2. DiagnosticTestReport
#    Modern execution-level reporting.
#    One report per execution test line.
#
# Why execution-level reporting matters:
# - package expansion support
# - partial report delivery
# - independent workflow tracking
# - lab technician workflows
# - enterprise scalability
#
# Architecture layering:
# DiagnosticOrder
#    -> DiagnosticOrderTestLine
#           -> DiagnosticTestReport
#
# Future direction:
# DiagnosticTestReport becomes the primary reporting model.
# =========================================================


class DiagnosticReport(models.Model):
    """
    Legacy order-level reporting model.

    Older/simple workflows may generate a single report
    for the entire diagnostic order.

    Example:
    CBC + Sugar + Lipid Profile
        -> one combined PDF/report

    Modern enterprise workflows should prefer
    DiagnosticTestReport for execution-level tracking.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    order = models.OneToOneField(
        DiagnosticOrder,
        on_delete=models.CASCADE,
        related_name="report",
        null=True,
        blank=True,
    )

    # Defines how report data is persisted.
    #
    # STRUCTURED:
    #     normalized JSON-style report data.
    #
    # FILE:
    #     uploaded PDF/image report.
    #
    # HYBRID:
    #     structured + uploaded artifacts.
    storage_mode = models.CharField(
        max_length=20,
        choices=ReportStorageMode.choices,
        default=ReportStorageMode.STRUCTURED,
    )

    # Structured machine-readable diagnostic result.
    # Future AI analytics and longitudinal tracking
    # will primarily use this layer.
    structured_result = models.JSONField(blank=True, null=True)
    file = models.FileField(upload_to="diagnostic_reports/", null=True, blank=True)

    # Report processing lifecycle.
    #
    # Independent from order lifecycle.
    # Example:
    # PENDING -> IN_PROGRESS -> READY -> DELIVERED
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

    # Locked after delivery to preserve
    # medical/legal audit integrity.
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

    # Handles:
    # - edit locking
    # - legacy order status synchronization
    # - audit logging
    # - report delivery timestamping
    def save(self, *args, **kwargs):
        with transaction.atomic():
            old_status = None
            if self.pk:
                old = type(self).objects.only("is_editable", "status").get(pk=self.pk)
                if not old.is_editable:
                    raise ValidationError("Report locked.")
                old_status = old.status

            super().save(*args, **kwargs)

            # Legacy compatibility path.
            #
            # If execution-level test lines do not exist,
            # synchronize order state using the legacy
            # single-report workflow.
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

    # Administrative override.
    #
    # Useful for:
    # - corrected reports
    # - compliance fixes
    # - upload mistakes
    def allow_admin_edit(self):
        self.is_editable = True
        self.save(update_fields=["is_editable"])

    def __str__(self):
        return f"Report - {self.order_id or 'no-order'}"


class DiagnosticTestReport(models.Model):
    """
    Execution-level diagnostic reporting model.

    Each DiagnosticOrderTestLine gets its own report.

    Example:
    Full Body Package
        -> CBC report
        -> Lipid Profile report
        -> HbA1c report

    This is the preferred scalable architecture.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Direct linkage to execution-level workflow.
    #
    # Enables:
    # - partial completion
    # - package expansion tracking
    # - technician workflows
    # - granular operational monitoring
    order_test_line = models.OneToOneField(
        DiagnosticOrderTestLine,
        on_delete=models.CASCADE,
        related_name="test_report",
    )

    # Same storage abstraction as DiagnosticReport.
    # Designed for future structured + AI-ready reporting.
    storage_mode = models.CharField(
        max_length=20,
        choices=ReportStorageMode.choices,
        default=ReportStorageMode.STRUCTURED,
    )
    # Machine-readable diagnostic result.
    #
    # Future use cases:
    # - AI analytics
    # - trend tracking
    # - abnormality detection
    # - longitudinal patient history
    structured_result = models.JSONField(blank=True, null=True)
    file = models.FileField(upload_to="diagnostic_test_reports/", null=True, blank=True)

    # Execution-level report lifecycle state.
    #
    # Used by:
    # - lab technicians
    # - doctor dashboards
    # - patient notifications
    # - WhatsApp delivery workflows
    status = models.CharField(
        max_length=20,
        choices=ReportLifecycleStatus.choices,
        default=ReportLifecycleStatus.PENDING,
    )

    # Prevents post-delivery modification.
    # Important for audit + compliance safety.
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

    # Handles:
    # - edit locking
    # - execution-level aggregation
    # - order lifecycle synchronization
    # - audit logging
    def save(self, *args, **kwargs):
        with transaction.atomic():
            old_status = None
            if self.pk:
                old = type(self).objects.only("is_editable", "status").get(pk=self.pk)
                if not old.is_editable:
                    raise ValidationError("Report locked.")
                old_status = old.status

            super().save(*args, **kwargs)

            # Aggregate all execution-level report states
            # upward into the parent order lifecycle.
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


# Public exports for diagnostics reporting domain.
# Keeps imports standardized across services.
__all__ = [
    "DiagnosticReport",
    "DiagnosticTestReport",
]

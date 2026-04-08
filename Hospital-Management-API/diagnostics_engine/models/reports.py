import uuid

from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils import timezone

from .choices import OrderStatus, ReportLifecycleStatus, ReportStorageMode
from .orders import DiagnosticOrder


class DiagnosticReport(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    order = models.OneToOneField(
        DiagnosticOrder,
        on_delete=models.CASCADE,
        related_name="report",
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
    )

    is_editable = models.BooleanField(default=True)

    uploaded_at = models.DateTimeField(auto_now_add=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    delivered_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
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

            if self.status == ReportLifecycleStatus.READY:
                self.order.update_status(OrderStatus.REPORT_READY)

            if self.status == ReportLifecycleStatus.DELIVERED:
                self.order.update_status(OrderStatus.COMPLETED)
                self.delivered_at = timezone.now()
                self.is_editable = False

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

            super().save(*args, **kwargs)

    def allow_admin_edit(self):
        self.is_editable = True
        self.save(update_fields=["is_editable"])

    def __str__(self):
        return f"Report - {self.order.order_number}"


__all__ = [
    "DiagnosticReport",
]

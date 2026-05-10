
# =======================================================================
# Imports
# =======================================================================
from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models import BaseModel
from labs.choices.tracking import (
    SampleStatus,
    DeliveryStatus,
)


# =======================================================================
# Sample + Delivery lifecycle tracking models
# =======================================================================


class LabSampleTracking(BaseModel):
    """
    Tracks the lifecycle of a laboratory sample, including collection,
    reception at lab, processing events, and internal tracking metadata.
    Associates with the test line and the lab users involved in collection
    and receipt. Provides internal notes and rejection information as well.
    """
    test_line = models.OneToOneField(
        "diagnostics_engine.DiagnosticOrderTestLine",
        on_delete=models.CASCADE,
        related_name="sample_tracking",
    )
    sample_barcode = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
    )
    sample_type = models.CharField(
        max_length=50,
    )
    sample_status = models.CharField(
        max_length=30,
        choices=SampleStatus.choices,
        default=SampleStatus.COLLECTED,
        db_index=True,
    )
    collected_at = models.DateTimeField(
        null=True,
        blank=True,
    )
    received_at_lab = models.DateTimeField(
        null=True,
        blank=True,
    )
    processing_started_at = models.DateTimeField(
        null=True,
        blank=True,
    )
    processing_completed_at = models.DateTimeField(
        null=True,
        blank=True,
    )
    collected_by = models.ForeignKey(
        "labs.LabUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="collected_samples",
    )
    received_by = models.ForeignKey(
        "labs.LabUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="received_samples",
    )
    rejected_reason = models.TextField(
        blank=True,
        null=True,
    )
    internal_notes = models.TextField(
        blank=True,
        null=True,
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
    )

    class Meta:
        db_table = "lab_sample_tracking"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["sample_barcode"]),
            models.Index(fields=["sample_status"]),
            models.Index(fields=["collected_at"]),
            models.Index(fields=["received_at_lab"]),
        ]

    def __str__(self):
        return (
            f"{self.sample_barcode} - "
            f"{self.sample_status}"
        )


class LabReportDeliveryLog(BaseModel):
    """
    Tracks the delivery lifecycle of lab reports (e.g., via WhatsApp, SMS).
    Stores delivery status, recipient, channel, external provider message IDs,
    retry attempts, and metadata including provider payloads. Useful for
    auditing and troubleshooting delivery issues.
    """
    diagnostic_test_report = models.ForeignKey(
        "diagnostics_engine.DiagnosticTestReport",
        on_delete=models.CASCADE,
        related_name="delivery_logs",
        help_text=_("The diagnostic test report associated with this delivery log."),
    )
    delivery_channel = models.CharField(
        max_length=30,
        db_index=True,
        help_text=_("Channel used for delivery (e.g., WhatsApp, Email)."),
    )
    recipient = models.CharField(
        max_length=20,
        db_index=True,
        help_text=_("Recipient identifier (e.g., phone number, email address)."),
    )
    delivery_status = models.CharField(
        max_length=30,
        choices=DeliveryStatus.choices,
        db_index=True,
        help_text=_("Status of the delivery (e.g., sent, delivered, failed)."),
    )
    sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_("Timestamp when the report was sent."),
    )
    delivered_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_("Timestamp when the report was delivered."),
    )
    viewed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_("Timestamp when the report was viewed by the recipient."),
    )
    failure_reason = models.TextField(
        blank=True,
        null=True,
        help_text=_("Reason for delivery failure, if applicable."),
    )
    external_message_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        db_index=True,
        help_text=_("External provider's message ID for this delivery."),
    )
    retry_count = models.PositiveIntegerField(
        default=0,
        help_text=_("Number of delivery retry attempts."),
    )
    last_retry_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_("Timestamp of the last retry attempt."),
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text=_(
            "Raw provider response payloads or delivery metadata.",
        ),
    )

    class Meta:
        db_table = "lab_report_delivery_logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["delivery_status"]),
            models.Index(fields=["recipient"]),
            models.Index(fields=["delivery_channel"]),
            models.Index(fields=["external_message_id"]),
        ]

    def __str__(self):
        return (
            f"{self.diagnostic_test_report_id} - "
            f"{self.delivery_status}"
        )
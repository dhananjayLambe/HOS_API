from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from core.models import BaseModel

phone_regex = RegexValidator(
    regex=r"^\+?1?\d{9,15}$",
    message=_(
        "Phone number must be entered in the format: '+999999999'. "
        "Up to 15 digits allowed."
    ),
)


class WhatsAppMessageType(models.TextChoices):
    PRESCRIPTION = "PRESCRIPTION", _("Prescription")
    REPORT = "REPORT", _("Report")
    TEST_BOOKING = "TEST_BOOKING", _("Test Booking")
    FOLLOWUP = "FOLLOWUP", _("Follow Up")
    APPOINTMENT = "APPOINTMENT", _("Appointment")
    OTP = "OTP", _("OTP")



class WhatsAppMessageStatus(models.TextChoices):
    QUEUED = "QUEUED", _("Queued")
    SENT = "SENT", _("Sent")
    DELIVERED = "DELIVERED", _("Delivered")
    READ = "READ", _("Read")
    FAILED = "FAILED", _("Failed")
    SKIPPED = "SKIPPED", _("Skipped")


# === New Enums ===
class WhatsAppProvider(models.TextChoices):
    META = "META", _("Meta")


class WhatsAppConversationCategory(models.TextChoices):
    UTILITY = "UTILITY", _("Utility")
    MARKETING = "MARKETING", _("Marketing")
    AUTHENTICATION = "AUTHENTICATION", _("Authentication")
    SERVICE = "SERVICE", _("Service")


_TERMINAL_STATUSES = frozenset(
    {
        WhatsAppMessageStatus.DELIVERED,
        WhatsAppMessageStatus.READ,
        WhatsAppMessageStatus.FAILED,
        WhatsAppMessageStatus.SKIPPED,
    }
)

_STATUS_TIMESTAMP_FIELDS = {
    WhatsAppMessageStatus.SENT: "sent_at",
    WhatsAppMessageStatus.DELIVERED: "delivered_at",
    WhatsAppMessageStatus.READ: "read_at",
}


class WhatsAppMessage(BaseModel):
    """
    Tracks every WhatsApp message sent from the platform.

    Inherits audit, soft-delete, and UUID PK from BaseModel.
    Links optionally to clinical entities (encounter, prescription, report, etc.)
    for traceability and ops troubleshooting.
    """

    provider = models.CharField(
        max_length=20,
        choices=WhatsAppProvider.choices,
        default=WhatsAppProvider.META,
        help_text=_("WhatsApp provider used to send the message."),
    )

    conversation_category = models.CharField(
        max_length=50,
        choices=WhatsAppConversationCategory.choices,
        default=WhatsAppConversationCategory.UTILITY,
        help_text=_("WhatsApp conversation category used for billing analytics."),
    )

    message_type = models.CharField(
        max_length=50,
        choices=WhatsAppMessageType.choices,
        help_text=_("Business category of the outbound WhatsApp message."),
    )

    status = models.CharField(
        max_length=20,
        choices=WhatsAppMessageStatus.choices,
        default=WhatsAppMessageStatus.QUEUED,
        help_text=_("Delivery lifecycle status from the WhatsApp provider."),
    )

    patient = models.ForeignKey(
        "patient_account.PatientProfile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="whatsapp_messages",
        help_text=_("Patient profile the message relates to, when applicable."),
    )

    clinic = models.ForeignKey(
        "clinic.Clinic",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="whatsapp_messages",
        help_text=_("Clinic context for the outbound message."),
    )

    doctor = models.ForeignKey(
        "doctor.doctor",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="whatsapp_messages",
        help_text=_("Doctor context for appointment or prescription messages."),
    )

    encounter = models.ForeignKey(
        "consultations_core.ClinicalEncounter",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="whatsapp_messages",
        help_text=_("Clinical encounter linked to this message."),
    )

    prescription = models.ForeignKey(
        "consultations_core.Prescription",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="whatsapp_messages",
        help_text=_("Prescription linked to this message."),
    )

    diagnostic_test_report = models.ForeignKey(
        "diagnostics_engine.DiagnosticTestReport",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="whatsapp_messages",
        help_text=_("Diagnostic test report linked to this message."),
    )

    diagnostic_order = models.ForeignKey(
        "diagnostics_engine.DiagnosticOrder",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="whatsapp_messages",
        help_text=_("Diagnostic order linked to test-booking messages."),
    )

    appointment = models.ForeignKey(
        "appointments.Appointment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="whatsapp_messages",
        help_text=_("Appointment linked to this message."),
    )

    recipient_mobile_number = models.CharField(
        max_length=20,
        blank=True,
        default="",
        validators=[phone_regex],
        help_text=_("E.164-style mobile number of the WhatsApp recipient."),
    )

    recipient_name = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text=_("Display name of the recipient at send time."),
    )

    meta_message_id = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text=_("Meta/WhatsApp provider message ID for webhook correlation."),
    )

    idempotency_key = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        db_index=True,
        help_text=_(
            "Unique key used to prevent duplicate WhatsApp messages "
            "for the same business event."
        ),
    )

    template_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text=_("Approved WhatsApp template name used for delivery."),
    )

    error_code = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text=_("Provider or platform error code when delivery fails."),
    )

    failure_reason = models.TextField(
        blank=True,
        null=True,
        help_text=_("Human-readable failure reason from the provider or platform."),
    )

    queued_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_("Timestamp when the message was queued for send."),
    )
    sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_("Timestamp when the provider accepted the send."),
    )
    delivered_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_("Timestamp when the message was delivered to the device."),
    )
    read_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_("Timestamp when the recipient read the message."),
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

    request_payload = models.JSONField(
        default=dict,
        blank=True,
        help_text=_("Outgoing payload sent to the WhatsApp provider."),
    )

    response_payload = models.JSONField(
        default=dict,
        blank=True,
        help_text=_("Provider response received immediately after send."),
    )

    webhook_payload = models.JSONField(
        default=dict,
        blank=True,
        help_text=_("Latest webhook payload received from provider."),
    )

    class Meta:
        db_table = "whatsapp_messages"
        verbose_name = _("WhatsApp Message")
        verbose_name_plural = _("WhatsApp Messages")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "message_type"]),
            models.Index(fields=["patient", "created_at"]),
            models.Index(fields=["clinic", "created_at"]),
            models.Index(fields=["meta_message_id"]),
            models.Index(fields=["recipient_mobile_number"]),
            models.Index(fields=["provider", "status"]),
            models.Index(fields=["conversation_category"]),
            models.Index(fields=["idempotency_key"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["meta_message_id"],
                condition=~models.Q(meta_message_id=""),
                name="uniq_whatsapp_meta_message_id_nonempty",
            ),
            models.UniqueConstraint(
                fields=["idempotency_key"],
                condition=models.Q(idempotency_key__isnull=False),
                name="uniq_whatsapp_idempotency_key",
            ),
        ]

    def __str__(self):
        return (
            f"{self.id} | {self.message_type} | "
            f"{self.recipient_mobile_number} | {self.status}"
        )

    def mark_status(self, new_status, *, at=None):
        """Set status and the corresponding lifecycle timestamp atomically."""
        if new_status not in WhatsAppMessageStatus.values:
            raise ValidationError(f"Invalid WhatsApp message status: {new_status}")

        timestamp = at or timezone.now()
        self.status = new_status

        if new_status == WhatsAppMessageStatus.QUEUED:
            self.queued_at = self.queued_at or timestamp
        elif new_status in (WhatsAppMessageStatus.FAILED, WhatsAppMessageStatus.SKIPPED):
            pass
        else:
            field_name = _STATUS_TIMESTAMP_FIELDS.get(new_status)
            if field_name:
                setattr(self, field_name, timestamp)

        update_fields = ["status", "updated_at"]
        if new_status == WhatsAppMessageStatus.QUEUED:
            update_fields.append("queued_at")
        elif field_name := _STATUS_TIMESTAMP_FIELDS.get(new_status):
            update_fields.append(field_name)

        self.save(update_fields=update_fields)

    def clean(self):
        super().clean()

        if not self.recipient_mobile_number and self.status not in {
            WhatsAppMessageStatus.SKIPPED,
            WhatsAppMessageStatus.FAILED,
        }:
            raise ValidationError(
                {"recipient_mobile_number": _("Recipient mobile number is required.")}
            )

        self._validate_type_fk_consistency()
        self._validate_status_timestamps()

        if self.pk:
            self._validate_terminal_immutability()

    def _validate_type_fk_consistency(self):
        type_fk_rules = {
            WhatsAppMessageType.PRESCRIPTION: (
                self.prescription_id or self.encounter_id,
                _("Prescription messages require a prescription or encounter."),
            ),
            WhatsAppMessageType.REPORT: (
                self.diagnostic_test_report_id,
                _("Report messages require a diagnostic test report."),
            ),
            WhatsAppMessageType.TEST_BOOKING: (
                self.diagnostic_order_id,
                _("Test booking messages require a diagnostic order."),
            ),
            WhatsAppMessageType.APPOINTMENT: (
                self.appointment_id,
                _("Appointment messages require an appointment."),
            ),
            WhatsAppMessageType.FOLLOWUP: (
                self.encounter_id,
                _("Follow-up messages require an encounter."),
            ),
        }

        rule = type_fk_rules.get(self.message_type)
        if rule and not rule[0]:
            raise ValidationError({"message_type": rule[1]})

    def _validate_status_timestamps(self):
        status_timestamp_rules = {
            WhatsAppMessageStatus.SENT: ("sent_at", _("Sent messages require sent_at.")),
            WhatsAppMessageStatus.DELIVERED: (
                "delivered_at",
                _("Delivered messages require delivered_at."),
            ),
            WhatsAppMessageStatus.READ: (
                "read_at",
                _("Read messages require read_at."),
            ),
        }

        for status, (field_name, message) in status_timestamp_rules.items():
            if self.status == status and not getattr(self, field_name):
                raise ValidationError({field_name: message})

    def _validate_terminal_immutability(self):
        old = (
            type(self)
            .objects.filter(pk=self.pk)
            .values(
                "status",
                "message_type",
                "recipient_mobile_number",
                "patient_id",
                "clinic_id",
                "doctor_id",
                "encounter_id",
                "prescription_id",
                "diagnostic_test_report_id",
                "diagnostic_order_id",
                "appointment_id",
            )
            .first()
        )
        if not old or old["status"] not in _TERMINAL_STATUSES:
            return

        immutable_fields = (
            "message_type",
            "recipient_mobile_number",
            "patient_id",
            "clinic_id",
            "doctor_id",
            "encounter_id",
            "prescription_id",
            "diagnostic_test_report_id",
            "diagnostic_order_id",
            "appointment_id",
        )
        for field in immutable_fields:
            if getattr(self, field) != old[field]:
                raise ValidationError(
                    _("Cannot modify %(field)s after message reaches terminal status.")
                    % {"field": field}
                )

    def save(self, *args, **kwargs):
        if self.status == WhatsAppMessageStatus.QUEUED and not self.queued_at:
            self.queued_at = timezone.now()
        self.full_clean()
        super().save(*args, **kwargs)

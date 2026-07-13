"""Communication Audit Framework enumerations."""

from django.db import models


class CommunicationChannel(models.TextChoices):
    WHATSAPP = "WHATSAPP", "WhatsApp"
    EMAIL = "EMAIL", "Email"
    SMS = "SMS", "SMS"
    PORTAL = "PORTAL", "Portal"
    PUSH_NOTIFICATION = "PUSH_NOTIFICATION", "Push Notification"
    VOICE_CALL = "VOICE_CALL", "Voice Call"
    IVR = "IVR", "IVR"
    FAX = "FAX", "Fax"
    PRINT = "PRINT", "Print"
    API = "API", "API"
    WEBHOOK = "WEBHOOK", "Webhook"


class CommunicationProvider(models.TextChoices):
    META = "META", "Meta"
    AWS_SES = "AWS_SES", "AWS SES"
    AWS_SNS = "AWS_SNS", "AWS SNS"
    TWILIO = "TWILIO", "Twilio"
    MSG91 = "MSG91", "MSG91"
    GUPSHUP = "GUPSHUP", "Gupshup"
    SMTP = "SMTP", "SMTP"
    INTERNAL = "INTERNAL", "Internal"
    NONE = "NONE", "None"


class CommunicationStrategy(models.TextChoices):
    PRIMARY = "PRIMARY", "Primary"
    FALLBACK = "FALLBACK", "Fallback"
    BROADCAST = "BROADCAST", "Broadcast"
    MANUAL = "MANUAL", "Manual"
    PORTAL_ONLY = "PORTAL_ONLY", "Portal Only"
    PARALLEL = "PARALLEL", "Parallel"
    SEQUENTIAL = "SEQUENTIAL", "Sequential"
    PATIENT_PREFERENCE = "PATIENT_PREFERENCE", "Patient Preference"


class CommunicationStatus(models.TextChoices):
    READY = "READY", "Ready"
    QUEUED = "QUEUED", "Queued"
    SENDING = "SENDING", "Sending"
    SENT = "SENT", "Sent"
    DELIVERED = "DELIVERED", "Delivered"
    READ = "READ", "Read"
    ACKNOWLEDGED = "ACKNOWLEDGED", "Acknowledged"
    FAILED = "FAILED", "Failed"
    RETRY = "RETRY", "Retry"
    EXPIRED = "EXPIRED", "Expired"
    CANCELLED = "CANCELLED", "Cancelled"
    PUBLISHED = "PUBLISHED", "Published"
    VIEWED = "VIEWED", "Viewed"


class CommunicationType(models.TextChoices):
    REPORT = "REPORT", "Report"
    PRESCRIPTION = "PRESCRIPTION", "Prescription"
    INVOICE = "INVOICE", "Invoice"
    REMINDER = "REMINDER", "Reminder"
    OTP = "OTP", "OTP"
    CONSENT = "CONSENT", "Consent"
    RECEIPT = "RECEIPT", "Receipt"
    MARKETING = "MARKETING", "Marketing"

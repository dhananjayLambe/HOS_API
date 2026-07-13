"""Investigation engine enumerations."""

from django.db import models


class InvestigationLevel(models.TextChoices):
    BASIC = "Basic", "Basic"
    STANDARD = "Standard", "Standard"
    FULL = "Full", "Full"
    DEEP = "Deep", "Deep"


class InvestigationHealth(models.TextChoices):
    HEALTHY = "Healthy", "Healthy"
    DELAYED = "Delayed", "Delayed"
    RETRYING = "Retrying", "Retrying"
    WAITING = "Waiting", "Waiting"
    FAILED = "Failed", "Failed"
    COMPLETED = "Completed", "Completed"
    ATTENTION_REQUIRED = "AttentionRequired", "Attention Required"


class ErrorClassification(models.TextChoices):
    BUSINESS = "Business", "Business"
    TECHNICAL = "Technical", "Technical"
    INFRASTRUCTURE = "Infrastructure", "Infrastructure"
    PROVIDER = "Provider", "Provider"
    UNKNOWN = "Unknown", "Unknown"

"""Incident reconstruction enumerations."""

from django.db import models


class ReconstructionLevel(models.TextChoices):
    BASIC = "Basic", "Basic"
    STANDARD = "Standard", "Standard"
    FULL = "Full", "Full"
    DEEP = "Deep", "Deep"


class WorkflowNodeType(models.TextChoices):
    WORKFLOW = "Workflow", "Workflow"
    AUDIT = "Audit", "Audit"
    PATIENT = "Patient", "Patient"
    LABORATORY = "Laboratory", "Laboratory"
    PROVIDER = "Provider", "Provider"
    MESSAGE = "Message", "Message"
    PAYMENT = "Payment", "Payment"


class WorkflowEdgeType(models.TextChoices):
    PARENT = "Parent", "Parent"
    CHILD = "Child", "Child"
    TRIGGERED = "Triggered", "Triggered"
    DEPENDS_ON = "DependsOn", "Depends On"
    RETRY = "Retry", "Retry"
    COMMUNICATION = "Communication", "Communication"


class FailureType(models.TextChoices):
    PROVIDER = "Provider", "Provider Error"
    APPLICATION = "Application", "Application Error"
    INFRASTRUCTURE = "Infrastructure", "Infrastructure Error"
    TIMEOUT = "Timeout", "Timeout"
    VALIDATION = "Validation", "Validation Error"
    UNKNOWN = "Unknown", "Unknown"

"""Support Trace enumerations."""

from django.db import models


class TraceStatus(models.TextChoices):
    STARTED = "Started", "Started"
    RUNNING = "Running", "Running"
    WAITING = "Waiting", "Waiting"
    COMPLETED = "Completed", "Completed"
    FAILED = "Failed", "Failed"
    CANCELLED = "Cancelled", "Cancelled"
    EXPIRED = "Expired", "Expired"


class SyncStatus(models.TextChoices):
    PENDING = "Pending", "Pending"
    INDEXED = "Indexed", "Indexed"
    FAILED = "Failed", "Failed"
    RETRY = "Retry", "Retry"


class TraceSource(models.TextChoices):
    CLINICAL_AUDIT = "ClinicalAudit", "Clinical Audit"
    BUSINESS_AUDIT = "BusinessAudit", "Business Audit"
    MANUAL = "Manual", "Manual"
    SYSTEM = "System", "System"


class WorkflowHealth(models.TextChoices):
    HEALTHY = "Healthy", "Healthy"
    WARNING = "Warning", "Warning"
    FAILED = "Failed", "Failed"
    BLOCKED = "Blocked", "Blocked"


TERMINAL_TRACE_STATUSES = frozenset(
    {
        TraceStatus.COMPLETED,
        TraceStatus.FAILED,
        TraceStatus.CANCELLED,
        TraceStatus.EXPIRED,
    }
)

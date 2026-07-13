"""Timeline enumerations."""

from django.db import models


class TimelineCategory(models.TextChoices):
    CLINICAL = "Clinical", "Clinical"
    BUSINESS = "Business", "Business"
    WORKFLOW = "Workflow", "Workflow"
    COMMUNICATION = "Communication", "Communication"
    DECISION = "Decision", "Decision"
    SYSTEM = "System", "System"
    SECURITY = "Security", "Security"


class TimelineSource(models.TextChoices):
    CLINICAL_AUDIT = "ClinicalAudit", "Clinical Audit"
    BUSINESS_AUDIT = "BusinessAudit", "Business Audit"
    SUPPORT_TRACE = "SupportTrace", "Support Trace"
    CLOUDWATCH = "CloudWatch", "CloudWatch"


class TimelineSeverity(models.TextChoices):
    INFO = "Info", "Info"
    WARNING = "Warning", "Warning"
    ERROR = "Error", "Error"
    CRITICAL = "Critical", "Critical"


class SnapshotWorkflowHealth(models.TextChoices):
    HEALTHY = "Healthy", "Healthy"
    DELAYED = "Delayed", "Delayed"
    RETRYING = "Retrying", "Retrying"
    FAILED = "Failed", "Failed"
    COMPLETED = "Completed", "Completed"

from django.db import models


class CommissionType(models.TextChoices):
    FLAT = "flat", "Flat Amount"
    PERCENT = "percent", "Percentage"


class OrderStatus(models.TextChoices):
    CREATED = "created", "Created"
    CONFIRMED = "confirmed", "Confirmed"
    SAMPLE_COLLECTED = "sample_collected", "Sample Collected"
    IN_PROCESSING = "in_processing", "In Processing"
    REPORT_READY = "report_ready", "Report Ready"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"


class ReportStorageMode(models.TextChoices):
    STRUCTURED = "structured", "Structured Only"
    FILE = "file", "File Only"
    HYBRID = "hybrid", "Structured + File"


class ReportLifecycleStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    IN_PROGRESS = "in_progress", "In Progress"
    READY = "ready", "Ready"
    DELIVERED = "delivered", "Delivered"
    REJECTED = "rejected", "Rejected"


__all__ = [
    "CommissionType",
    "OrderStatus",
    "ReportLifecycleStatus",
    "ReportStorageMode",
]

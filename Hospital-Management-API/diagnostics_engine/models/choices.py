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
    PARTIAL = "partial", "Partially Completed"
    CANCELLED = "cancelled", "Cancelled"


class PackageType(models.TextChoices):
    SYSTEM = "system", "System"
    CUSTOM = "custom", "Custom"


class CollectionType(models.TextChoices):
    HOME = "home", "Home"
    LAB = "lab", "Lab"
    BOTH = "both", "Both"


class FulfillmentMode(models.TextChoices):
    STRICT = "strict", "Strict"
    PARTIAL = "partial", "Partial"


class CommissionSource(models.TextChoices):
    DEFAULT = "default", "Default"
    CAMPAIGN = "campaign", "Campaign"
    CUSTOM = "custom", "Custom"


class OrderLineType(models.TextChoices):
    TEST = "test", "Test"
    PACKAGE = "package", "Package"


class ExecutionType(models.TextChoices):
    HOME_COLLECTION = "home_collection", "Home Collection"
    BRANCH_VISIT = "branch_visit", "Branch Visit"
    THIRD_PARTY = "third_party", "Third Party"


class OrderTestLineStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    SCHEDULED = "scheduled", "Scheduled"
    IN_PROGRESS = "in_progress", "In Progress"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"


class GenderApplicability(models.TextChoices):
    ALL = "all", "All"
    MALE = "male", "Male"
    FEMALE = "female", "Female"


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
    "CollectionType",
    "CommissionSource",
    "CommissionType",
    "ExecutionType",
    "FulfillmentMode",
    "GenderApplicability",
    "OrderLineType",
    "OrderStatus",
    "OrderTestLineStatus",
    "PackageType",
    "ReportLifecycleStatus",
    "ReportStorageMode",
]

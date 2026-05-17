from django.db import models
from django.utils.translation import gettext_lazy as _


class LabAssignmentStatus(models.TextChoices):
    PENDING = "PENDING", _("Pending")
    ACCEPTED = "ACCEPTED", _("Accepted")
    REJECTED = "REJECTED", _("Rejected")
    IN_PROGRESS = "IN_PROGRESS", _("In Progress")
    COMPLETED = "COMPLETED", _("Completed")
    CANCELLED = "CANCELLED", _("Cancelled")


class CollectionStatus(models.TextChoices):
    PENDING = "PENDING", _("Pending")
    ASSIGNED = "ASSIGNED", _("Assigned")
    IN_PROGRESS = "IN_PROGRESS", _("In Progress")
    COLLECTED = "COLLECTED", _("Collected")
    FAILED = "FAILED", _("Failed")
    CANCELLED = "CANCELLED", _("Cancelled")


class AppointmentStatus(models.TextChoices):
    PENDING = "PENDING", _("Pending")
    CONFIRMED = "CONFIRMED", _("Confirmed")
    CHECKED_IN = "CHECKED_IN", _("Checked In")
    COMPLETED = "COMPLETED", _("Completed")
    NO_SHOW = "NO_SHOW", _("No Show")
    CANCELLED = "CANCELLED", _("Cancelled")
    RESCHEDULED = "RESCHEDULED", _("Rescheduled")

# =========================================================
# TEST EXECUTION ENUMS
# =========================================================
class TestExecutionStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    ACCEPTED = "accepted", "Accepted"
    SCHEDULED = "scheduled", "Scheduled"
    SAMPLE_COLLECTED = "sample_collected", "Sample Collected"
    IN_PROCESSING = "in_processing", "In Processing"
    REPORT_READY = "report_ready", "Report Ready"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"
    REJECTED = "rejected", "Rejected"
    NO_SHOW = "no_show", "No Show"
    UNSUPPORTED = "unsupported", "Unsupported"


class TestExecutionType(models.TextChoices):
    HOME_COLLECTION = "home_collection", "Home Collection"
    BRANCH_VISIT = "branch_visit", "Branch Visit"
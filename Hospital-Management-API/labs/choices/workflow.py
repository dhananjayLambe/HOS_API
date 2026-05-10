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
    COLLECTION_STARTED = (
        "COLLECTION_STARTED",
        _("Collection Started"),
    )
    COLLECTED = "COLLECTED", _("Collected")
    FAILED = "FAILED", _("Failed")
    RESCHEDULED = "RESCHEDULED", _("Rescheduled")
    CANCELLED = "CANCELLED", _("Cancelled")


class AppointmentStatus(models.TextChoices):
    PENDING = "PENDING", _("Pending")
    CONFIRMED = "CONFIRMED", _("Confirmed")
    CHECKED_IN = "CHECKED_IN", _("Checked In")
    COMPLETED = "COMPLETED", _("Completed")
    NO_SHOW = "NO_SHOW", _("No Show")
    CANCELLED = "CANCELLED", _("Cancelled")
    RESCHEDULED = "RESCHEDULED", _("Rescheduled")
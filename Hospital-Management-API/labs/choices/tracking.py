from django.db import models
from django.utils.translation import gettext_lazy as _


class SampleStatus(models.TextChoices):
    COLLECTED = "COLLECTED", _("Collected")
    IN_TRANSIT = "IN_TRANSIT", _("In Transit")
    RECEIVED = "RECEIVED", _("Received")
    PROCESSING = "PROCESSING", _("Processing")
    COMPLETED = "COMPLETED", _("Completed")
    REJECTED = "REJECTED", _("Rejected")


class DeliveryStatus(models.TextChoices):
    PENDING = "PENDING", _("Pending")
    SENT = "SENT", _("Sent")
    DELIVERED = "DELIVERED", _("Delivered")
    VIEWED = "VIEWED", _("Viewed")
    FAILED = "FAILED", _("Failed")
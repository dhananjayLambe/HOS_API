from django.db import models
from django.utils.translation import gettext_lazy as _


class ReportReviewStatus(models.TextChoices):
    PENDING = "PENDING", _("Pending")
    UNDER_REVIEW = "UNDER_REVIEW", _("Under Review")
    APPROVED = "APPROVED", _("Approved")
    REJECTED = "REJECTED", _("Rejected")
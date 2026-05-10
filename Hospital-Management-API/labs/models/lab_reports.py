# labs/models/lab_reports.py

from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel
from labs.choices.reports import ReportReviewStatus


class LabReportReview(BaseModel):
    """
    Model to track the validation and review workflow of lab reports.

    This includes pathology and radiology approvals, compliance tracking,
    and support for future AI-based review and validation workflows.

    The model stores review status, reviewer details, notes, timestamps,
    and metadata for enhanced audit and automation capabilities.
    """

    diagnostic_test_report = models.OneToOneField(
        "diagnostics_engine.DiagnosticTestReport",
        on_delete=models.CASCADE,
        related_name="review",
    )

    reviewed_by = models.ForeignKey(
        "labs.LabUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_reports",
    )

    review_status = models.CharField(
        max_length=30,
        choices=ReportReviewStatus.choices,
        default=ReportReviewStatus.PENDING,
        db_index=True,
    )

    review_notes = models.TextField(
        blank=True,
        null=True,
    )

    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    approved_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    rejected_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    rejection_reason = models.TextField(
        blank=True,
        null=True,
    )

    internal_notes = models.TextField(
        blank=True,
        null=True,
        help_text=_(
            "Internal QA or compliance review notes.",
        ),
    )

    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text=_(
            "Additional workflow metadata or AI review payloads.",
        ),
    )

    class Meta:
        db_table = "lab_report_reviews"
        ordering = ["-created_at"]

        indexes = [
            models.Index(fields=["review_status"]),
            models.Index(fields=["reviewed_at"]),
            models.Index(fields=["approved_at"]),
        ]

    def __str__(self):
        return (
            f"{self.diagnostic_test_report_id} - "
            f"{self.review_status}"
        )
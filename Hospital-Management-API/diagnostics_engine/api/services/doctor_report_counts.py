"""Shared doctor dashboard diagnostic report counts."""

from __future__ import annotations

from django.db.models import Exists, OuterRef

from diagnostics_engine.models.choices import ReportLifecycleStatus
from diagnostics_engine.models.reports import DiagnosticReportArtifact, DiagnosticTestReport


def count_pending_doctor_reports(*, doctor_id, clinic_id) -> int:
    """
    READY reports awaiting doctor review with at least one uploaded artifact.
    Excludes draft-only rows without files.
    """
    has_uploaded_artifact = DiagnosticReportArtifact.objects.filter(
        report_id=OuterRef("pk"),
    ).exclude(file="")

    return (
        DiagnosticTestReport.objects.filter(
            status=ReportLifecycleStatus.READY,
            reviewed_at__isnull=True,
            deleted_at__isnull=True,
            order_test_line__order__encounter__doctor_id=doctor_id,
            order_test_line__order__encounter__clinic_id=clinic_id,
        )
        .annotate(_has_artifact=Exists(has_uploaded_artifact))
        .filter(_has_artifact=True)
        .distinct()
        .count()
    )

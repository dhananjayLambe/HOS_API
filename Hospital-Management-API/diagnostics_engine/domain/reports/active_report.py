"""Resolve the current active diagnostic test report for an execution line."""

from __future__ import annotations

from django.db.models import Exists, OuterRef, QuerySet

from diagnostics_engine.models.orders import DiagnosticOrderTestLine
from diagnostics_engine.models.reports import DiagnosticReportArtifact, DiagnosticTestReport


def active_reports_queryset(
    *,
    line: DiagnosticOrderTestLine | None = None,
    include_deleted: bool = False,
) -> QuerySet:
    """
    Reports that have not been superseded by another active report.

    By default excludes soft-deleted rows. When ``include_deleted=True``, soft-deleted
    active-head rows are included; superseded revisions remain excluded.
    """
    superseding = DiagnosticTestReport.objects.filter(
        supersedes_id=OuterRef("pk"),
        deleted_at__isnull=True,
    )
    qs = DiagnosticTestReport.objects.all()
    if not include_deleted:
        qs = qs.filter(deleted_at__isnull=True)
    qs = qs.annotate(_is_superseded=Exists(superseding)).filter(_is_superseded=False)
    if line is not None:
        qs = qs.filter(order_test_line=line)
    return qs.order_by("-revision_number", "-created_at")


def get_active_report_for_line(line: DiagnosticOrderTestLine) -> DiagnosticTestReport | None:
    """Latest active report head for a test line (corrections exclude superseded rows)."""
    return active_reports_queryset(line=line).first()


def get_primary_artifact(report: DiagnosticTestReport) -> DiagnosticReportArtifact | None:
    """Primary downloadable artifact for delivery and patient UX."""
    return (
        report.artifacts.filter(is_primary=True, is_active=True)
        .order_by("-uploaded_at")
        .first()
    )

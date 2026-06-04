"""Operational report history DTOs (active lineage only — not audit)."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from diagnostics_engine.models.reports import DiagnosticReportArtifact, DiagnosticTestReport
from diagnostics_engine.services.reports.report_query_service import ReportQueryService
from labs.models.lab_tracking import LabReportDeliveryLog


@dataclass(frozen=True)
class OperationalReportHistoryDTO:
    report_id: UUID
    supersedes_id: UUID | None
    superseded_by_id: UUID | None
    last_reupload_reason: str | None
    artifacts: list[DiagnosticReportArtifact]
    delivery_logs: list[LabReportDeliveryLog]


def build_operational_report_history_dto(report: DiagnosticTestReport) -> OperationalReportHistoryDTO:
    """Build active-lineage operational history for a report head."""
    supersedes_id = report.supersedes_id
    superseded_by = report.superseded_by_reports.filter(deleted_at__isnull=True).first()
    superseded_by_id = superseded_by.pk if superseded_by else None

    artifacts = list(ReportQueryService.get_active_artifacts(report=report))
    delivery_logs = _active_delivery_logs(report)

    return OperationalReportHistoryDTO(
        report_id=report.id,
        supersedes_id=supersedes_id,
        superseded_by_id=superseded_by_id,
        last_reupload_reason=report.last_reupload_reason,
        artifacts=artifacts,
        delivery_logs=delivery_logs,
    )


def _active_delivery_logs(report: DiagnosticTestReport) -> list[LabReportDeliveryLog]:
    cache = getattr(report, "_prefetched_objects_cache", None)
    if cache and "delivery_logs" in cache:
        return list(cache["delivery_logs"])
    return list(
        report.delivery_logs.filter(is_deleted=False).order_by("-created_at"),
    )

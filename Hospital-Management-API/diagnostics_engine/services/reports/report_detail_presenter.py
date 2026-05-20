"""Report detail and summary DTOs for operational APIs."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from django.core.exceptions import ValidationError

from diagnostics_engine.domain.reports import active_reports_queryset, get_primary_artifact
from diagnostics_engine.domain.reports.report_actions import allowed_actions_for_report
from diagnostics_engine.models.reports import DiagnosticReportArtifact, DiagnosticTestReport
from diagnostics_engine.services.reports.report_query_service import ReportQueryService
from labs.models.lab_tracking import LabReportDeliveryLog


@dataclass(frozen=True)
class ReportSummaryDTO:
    report_id: UUID
    patient_name: str
    test_label: str
    status: str
    delivery_status: str
    primary_artifact_filename: str | None
    updated_at: datetime


@dataclass(frozen=True)
class ReportDetailDTO:
    report: DiagnosticTestReport
    artifacts: list[DiagnosticReportArtifact]
    latest_delivery: LabReportDeliveryLog | None
    patient_summary: dict
    lineage: dict
    available_actions: list[str]


def build_report_summary_dto(report: DiagnosticTestReport) -> ReportSummaryDTO:
    profile = report.order_test_line.order.patient_profile
    service = report.order_test_line.service
    test_label = service.name if service else "Diagnostic report"
    primary = get_primary_artifact(report)
    filename = None
    if primary is not None:
        filename = primary.download_filename or primary.original_filename
    return ReportSummaryDTO(
        report_id=report.id,
        patient_name=profile.get_full_name() if profile else "",
        test_label=test_label,
        status=report.status,
        delivery_status=report.delivery_status,
        primary_artifact_filename=filename,
        updated_at=report.updated_at,
    )


def build_report_detail_dto(report_id: UUID) -> ReportDetailDTO:
    report = ReportQueryService.get_report(report_id)
    if report.deleted_at is not None:
        raise ValidationError("Report has been deleted.")
    if not active_reports_queryset().filter(pk=report.pk).exists():
        raise ValidationError("Report has been superseded and is no longer active.")

    artifacts = list(ReportQueryService.get_active_artifacts(report=report))
    latest_delivery = _latest_delivery_log(report)
    patient_summary = _patient_summary(report)
    lineage = _active_lineage(report)

    return ReportDetailDTO(
        report=report,
        artifacts=artifacts,
        latest_delivery=latest_delivery,
        patient_summary=patient_summary,
        lineage=lineage,
        available_actions=allowed_actions_for_report(report),
    )


def _latest_delivery_log(report: DiagnosticTestReport) -> LabReportDeliveryLog | None:
    cache = getattr(report, "_prefetched_objects_cache", None)
    if cache and "delivery_logs" in cache:
        logs = [log for log in cache["delivery_logs"] if not log.is_deleted]
        return logs[0] if logs else None
    return (
        report.delivery_logs.filter(is_deleted=False).order_by("-created_at").first()
    )


def _patient_summary(report: DiagnosticTestReport) -> dict:
    order = report.order_test_line.order
    profile = order.patient_profile
    encounter_id = None
    if order.consultation_id and order.consultation:
        enc = order.consultation.encounter
        encounter_id = str(enc.id) if enc else None
    phone = ""
    if profile and profile.account_id:
        user = getattr(profile.account, "user", None)
        phone = getattr(user, "username", "") or ""
    return {
        "name": profile.get_full_name() if profile else "",
        "phone": phone,
        "encounter_id": encounter_id,
    }


def _active_lineage(report: DiagnosticTestReport) -> dict:
    supersedes_id = str(report.supersedes_id) if report.supersedes_id else None
    superseded_by = report.superseded_by_reports.filter(deleted_at__isnull=True).first()
    superseded_by_id = str(superseded_by.pk) if superseded_by else None
    return {
        "supersedes_id": supersedes_id,
        "superseded_by_id": superseded_by_id,
    }

"""Operational action registry for diagnostic report workflows."""

from __future__ import annotations

from enum import StrEnum

from diagnostics_engine.models.choices import ReportLifecycleStatus
from diagnostics_engine.models.reports import DiagnosticTestReport
from labs.choices.tracking import DeliveryStatus


class ReportAction(StrEnum):
    UPLOAD_REPORT = "UPLOAD_REPORT"
    MARK_READY = "MARK_READY"
    SEND_WHATSAPP = "SEND_WHATSAPP"
    RETRY_DELIVERY = "RETRY_DELIVERY"
    DOWNLOAD_REPORT = "DOWNLOAD_REPORT"
    VIEW_REPORT = "VIEW_REPORT"
    CORRECT_REPORT = "CORRECT_REPORT"


_CORRECTABLE = frozenset({ReportLifecycleStatus.READY, ReportLifecycleStatus.DELIVERED})


def allowed_actions_for_report(report: DiagnosticTestReport) -> list[str]:
    """Derive UI/API actions from report lifecycle (presenter/service layer only)."""
    actions: list[str] = [ReportAction.VIEW_REPORT]

    if report.deleted_at is not None:
        return actions

    status = report.status
    delivery = report.delivery_status

    if report.is_editable and status in (
        ReportLifecycleStatus.PENDING,
        ReportLifecycleStatus.IN_PROGRESS,
    ):
        actions.append(ReportAction.UPLOAD_REPORT)

    if status == ReportLifecycleStatus.IN_PROGRESS:
        actions.append(ReportAction.MARK_READY)

    if status in (ReportLifecycleStatus.READY, ReportLifecycleStatus.DELIVERED):
        actions.append(ReportAction.DOWNLOAD_REPORT)

    if status in (ReportLifecycleStatus.READY, ReportLifecycleStatus.DELIVERED):
        actions.append(ReportAction.SEND_WHATSAPP)

    if delivery == DeliveryStatus.FAILED:
        actions.append(ReportAction.RETRY_DELIVERY)

    if status in _CORRECTABLE:
        actions.append(ReportAction.CORRECT_REPORT)

    return list(dict.fromkeys(actions))

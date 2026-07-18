"""Diagnostic audit integration hooks."""

from __future__ import annotations

import logging

from consultations_core.audit.commit import emit_after_commit
from diagnostics_engine.audit.diagnostic_audit_service import DiagnosticAuditService
from diagnostics_engine.audit.report_payload_builder import ReportPayloadBuilder
from diagnostics_engine.audit.test_payload_builder import TestPayloadBuilder

logger = logging.getLogger(__name__)


def schedule_test_ordered(*, order, user, test_count: int | None = None) -> None:
    try:
        encounter, consultation = DiagnosticAuditService.resolve_context_from_order(order)
        if encounter is None:
            return
        emit_after_commit(
            DiagnosticAuditService.emit_test_ordered,
            encounter,
            consultation,
            user,
            order=order,
            test_count=test_count,
            source=DiagnosticAuditService.resolve_source_from_user(user),
        )
    except Exception:
        logger.warning(
            "diagnostic_audit_test_ordered_schedule_failed",
            exc_info=True,
            extra={"order_id": str(getattr(order, "id", ""))},
        )


def schedule_test_recommendation_sent(*, message, user=None) -> None:
    try:
        encounter, consultation, payload = DiagnosticAuditService.resolve_context_from_message(
            message
        )
        if encounter is None:
            return
        recommendation_id = payload.get("recommendation_id") or getattr(message, "id", None)
        if recommendation_id is None:
            return
        emit_after_commit(
            DiagnosticAuditService.emit_test_recommendation_sent,
            encounter,
            consultation,
            user,
            recommendation_id=recommendation_id,
            test_count=TestPayloadBuilder.recommendation_count_from_payload(payload),
            source="system",
        )
    except Exception:
        logger.warning(
            "diagnostic_audit_recommendation_sent_schedule_failed",
            exc_info=True,
            extra={"message_id": str(getattr(message, "id", ""))},
        )


def schedule_report_uploaded(
    *,
    report,
    user,
    artifacts=None,
    report_count: int | None = None,
) -> None:
    try:
        encounter, consultation = DiagnosticAuditService.resolve_context_from_report(report)
        if encounter is None:
            return
        count = report_count if report_count is not None else len(artifacts or [])
        artifact_type = ReportPayloadBuilder.artifact_type_for_artifacts(artifacts or [])
        emit_after_commit(
            DiagnosticAuditService.emit_report_uploaded,
            encounter,
            consultation,
            user,
            report=report,
            artifact_type=artifact_type,
            report_count=max(1, count),
            source="lab",
        )
    except Exception:
        logger.warning(
            "diagnostic_audit_report_uploaded_schedule_failed",
            exc_info=True,
            extra={"report_id": str(getattr(report, "id", ""))},
        )


def schedule_report_viewed(
    *,
    report,
    user,
    viewer_platform: str = "Web",
    artifact_id: str | None = None,
) -> None:
    try:
        encounter, consultation = DiagnosticAuditService.resolve_context_from_report(report)
        if encounter is None:
            return
        DiagnosticAuditService.emit_report_viewed(
            encounter,
            consultation,
            user,
            report=report,
            viewer_platform=viewer_platform,
            source=DiagnosticAuditService.resolve_source_from_user(user, default="system"),
            artifact_id=artifact_id,
        )
    except Exception:
        logger.warning(
            "diagnostic_audit_report_viewed_failed",
            exc_info=True,
            extra={"report_id": str(getattr(report, "id", ""))},
        )


def schedule_report_downloaded(
    *,
    report,
    user,
    download_channel: str = "Web",
    artifact_id: str | None = None,
    download_format: str = "PDF",
) -> None:
    try:
        encounter, consultation = DiagnosticAuditService.resolve_context_from_report(report)
        if encounter is None:
            return
        DiagnosticAuditService.emit_report_downloaded(
            encounter,
            consultation,
            user,
            report=report,
            download_channel=download_channel,
            download_format=download_format,
            source=DiagnosticAuditService.resolve_source_from_user(user, default="patient"),
            artifact_id=artifact_id,
        )
    except Exception:
        logger.warning(
            "diagnostic_audit_report_downloaded_failed",
            exc_info=True,
            extra={"report_id": str(getattr(report, "id", ""))},
        )


def schedule_report_shared(
    *,
    report,
    user,
    channel: str = "WHATSAPP",
    recipient_type: str = "Patient",
) -> None:
    try:
        encounter, consultation = DiagnosticAuditService.resolve_context_from_report(report)
        if encounter is None:
            return
        emit_after_commit(
            DiagnosticAuditService.emit_report_shared,
            encounter,
            consultation,
            user,
            report=report,
            share_channel=ReportPayloadBuilder.share_channel_label(channel),
            recipient_type=recipient_type,
            source="lab",
        )
    except Exception:
        logger.warning(
            "diagnostic_audit_report_shared_schedule_failed",
            exc_info=True,
            extra={"report_id": str(getattr(report, "id", ""))},
        )

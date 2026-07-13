"""Report delivery communication audit integration hooks."""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any

from business_audit.communication.context import (
    build_report_communication_context,
    ensure_communication_attempt_metadata,
    resolve_organization_id_from_report,
)
from business_audit.communication.enums import CommunicationStrategy
from business_audit.communication.report.report_communication_audit_service import (
    ReportCommunicationAuditService,
)
from business_audit.communication.types import CommunicationContext
from business_audit.domain.context import apply_workflow_context
from consultations_core.audit.commit import emit_after_commit

logger = logging.getLogger(__name__)


@dataclass
class ReportCommunicationRuntime:
    """Timing and context for one delivery attempt."""

    ctx: CommunicationContext
    organization_id: str | None = None
    prepared_at: float | None = None
    send_started_at: float | None = None


def _apply_communication_workflow(workflow_instance_id: str) -> None:
    apply_workflow_context(workflow_instance_id=workflow_instance_id)


def schedule_report_ready(
    *,
    report,
    user=None,
    request_id: str | None = None,
) -> CommunicationContext:
    """Emit report.ready after mark_ready."""
    ctx = build_report_communication_context(report)
    org_id = resolve_organization_id_from_report(report)
    try:
        _apply_communication_workflow(ctx.communication_id)
        emit_after_commit(
            ReportCommunicationAuditService.emit_report_ready,
            ctx=ctx,
            organization_id=org_id,
            user=user,
            request_id=request_id,
        )
    except Exception:
        logger.warning(
            "report_ready_communication_schedule_failed",
            exc_info=True,
            extra={"communication_id": ctx.communication_id},
        )
    return ctx


def schedule_delivery_requested(
    *,
    report,
    delivery_log,
    user=None,
    request_id: str | None = None,
    queue_wait_ms: int = 0,
) -> ReportCommunicationRuntime:
    """Emit report.delivery_requested after prepare_report_delivery."""
    ensure_communication_attempt_metadata(delivery_log, report=report)
    ctx = build_report_communication_context(report, delivery_log=delivery_log)
    org_id = resolve_organization_id_from_report(report)
    runtime = ReportCommunicationRuntime(
        ctx=ctx,
        organization_id=org_id,
        prepared_at=time.monotonic(),
    )
    try:
        _apply_communication_workflow(ctx.communication_attempt_id or ctx.communication_id)
        emit_after_commit(
            ReportCommunicationAuditService.emit_delivery_requested,
            ctx=ctx,
            channel=delivery_log.delivery_channel,
            queue_wait_ms=queue_wait_ms,
            organization_id=org_id,
            user=user,
            request_id=request_id,
        )
    except Exception:
        logger.warning(
            "delivery_requested_communication_schedule_failed",
            exc_info=True,
            extra={
                "communication_id": ctx.communication_id,
                "communication_attempt_id": ctx.communication_attempt_id,
            },
        )
    return runtime


def mark_delivery_send_started(runtime: ReportCommunicationRuntime) -> None:
    runtime.send_started_at = time.monotonic()


def schedule_channel_delivery_success(
    *,
    report,
    delivery_log,
    runtime: ReportCommunicationRuntime | None = None,
    external_message_id: str | None = None,
    request_payload: Any = None,
    response_payload: Any = None,
    user=None,
    request_id: str | None = None,
) -> None:
    """Emit report.{channel}_delivery after successful provider send."""
    ensure_communication_attempt_metadata(delivery_log, report=report)
    ctx = build_report_communication_context(report, delivery_log=delivery_log)
    org_id = resolve_organization_id_from_report(report)
    channel = (delivery_log.delivery_channel or "WHATSAPP").upper()

    queue_wait_ms = 0
    provider_latency_ms = 0
    total_delivery_ms = 0
    if runtime is not None:
        now = time.monotonic()
        if runtime.prepared_at is not None:
            total_delivery_ms = int((now - runtime.prepared_at) * 1000)
        if runtime.send_started_at is not None:
            provider_latency_ms = int((now - runtime.send_started_at) * 1000)
            if runtime.prepared_at is not None:
                queue_wait_ms = int((runtime.send_started_at - runtime.prepared_at) * 1000)

    emit_fn = {
        "WHATSAPP": ReportCommunicationAuditService.emit_whatsapp_delivery,
        "EMAIL": ReportCommunicationAuditService.emit_email_delivery,
        "SMS": ReportCommunicationAuditService.emit_sms_delivery,
    }.get(channel, ReportCommunicationAuditService.emit_whatsapp_delivery)

    try:
        _apply_communication_workflow(ctx.communication_attempt_id or ctx.communication_id)
        emit_after_commit(
            emit_fn,
            ctx=ctx,
            provider_reference=external_message_id or delivery_log.external_message_id,
            request_payload=request_payload,
            response_payload=response_payload,
            queue_wait_ms=queue_wait_ms,
            provider_latency_ms=provider_latency_ms,
            total_delivery_ms=total_delivery_ms,
            organization_id=org_id,
            user=user,
            request_id=request_id,
        )
    except Exception:
        logger.warning(
            "channel_delivery_communication_schedule_failed",
            exc_info=True,
            extra={
                "communication_id": ctx.communication_id,
                "channel": channel,
            },
        )


def schedule_delivery_failed(
    *,
    report,
    delivery_log,
    reason: str = "",
    error_classification: str | None = None,
    retry_delay_ms: int = 0,
    request_payload: Any = None,
    response_payload: Any = None,
    user=None,
    request_id: str | None = None,
) -> None:
    """Emit report.delivery_failed after mark_delivery_failed."""
    ensure_communication_attempt_metadata(delivery_log, report=report)
    ctx = build_report_communication_context(report, delivery_log=delivery_log)
    org_id = resolve_organization_id_from_report(report)
    try:
        _apply_communication_workflow(ctx.communication_attempt_id or ctx.communication_id)
        emit_after_commit(
            ReportCommunicationAuditService.emit_delivery_failed,
            ctx=ctx,
            channel=delivery_log.delivery_channel,
            reason=reason,
            error_classification=error_classification,
            provider_reference=delivery_log.external_message_id,
            request_payload=request_payload,
            response_payload=response_payload,
            retry_delay_ms=retry_delay_ms,
            organization_id=org_id,
            user=user,
            request_id=request_id,
        )
    except Exception:
        logger.warning(
            "delivery_failed_communication_schedule_failed",
            exc_info=True,
            extra={
                "communication_id": ctx.communication_id,
                "communication_attempt_id": ctx.communication_attempt_id,
            },
        )


def schedule_delivery_retried(
    *,
    report,
    parent_log,
    new_log,
    previous_error: str = "",
    user=None,
    request_id: str | None = None,
) -> None:
    """Emit report.delivery_retried after retry_delivery creates new log."""
    ensure_communication_attempt_metadata(new_log, report=report)
    ctx = build_report_communication_context(report, delivery_log=new_log)
    org_id = resolve_organization_id_from_report(report)
    try:
        _apply_communication_workflow(ctx.communication_attempt_id or ctx.communication_id)
        emit_after_commit(
            ReportCommunicationAuditService.emit_delivery_retried,
            ctx=ctx,
            previous_channel=parent_log.delivery_channel,
            new_channel=new_log.delivery_channel,
            previous_error=previous_error or parent_log.failure_reason or "delivery_failed",
            parent_attempt_id=str(parent_log.pk),
            communication_strategy=CommunicationStrategy.FALLBACK,
            organization_id=org_id,
            user=user,
            request_id=request_id,
        )
    except Exception:
        logger.warning(
            "delivery_retried_communication_schedule_failed",
            exc_info=True,
            extra={
                "communication_id": ctx.communication_id,
                "parent_attempt_id": str(parent_log.pk),
            },
        )


def schedule_report_portal_communication(
    *,
    report,
    user=None,
    request_id: str | None = None,
) -> None:
    """Extension point stub for portal publisher — emits report.portal_delivery."""
    ctx = build_report_communication_context(report)
    org_id = resolve_organization_id_from_report(report)
    try:
        _apply_communication_workflow(ctx.communication_id)
        emit_after_commit(
            ReportCommunicationAuditService.emit_portal_delivery,
            ctx=ctx,
            organization_id=org_id,
            user=user,
            request_id=request_id,
        )
    except Exception:
        logger.warning(
            "portal_communication_schedule_failed",
            exc_info=True,
            extra={"communication_id": ctx.communication_id},
        )


def schedule_communication_webhook_received(
    *,
    communication_id: str,
    communication_attempt_id: str,
    provider: str,
    provider_reference: str,
    webhook_event_type: str,
    new_status: str,
    organization_id: str,
    request_id: str | None = None,
) -> None:
    """Extension point stub for provider webhook callbacks."""
    try:
        _apply_communication_workflow(communication_attempt_id)
        emit_after_commit(
            ReportCommunicationAuditService.emit_webhook_received,
            communication_id=communication_id,
            communication_attempt_id=communication_attempt_id,
            provider=provider,
            provider_reference=provider_reference,
            webhook_event_type=webhook_event_type,
            new_status=new_status,
            organization_id=organization_id,
            request_id=request_id,
        )
    except Exception:
        logger.warning(
            "communication_webhook_schedule_failed",
            exc_info=True,
            extra={
                "communication_id": communication_id,
                "provider_reference": provider_reference,
            },
        )

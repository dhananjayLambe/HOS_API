"""Facade for report delivery communication business audit events."""

from __future__ import annotations

import logging
from typing import Any

from business_audit.communication.constants import (
    COMM_STATE_DELIVERED,
    COMM_STATE_FAILED,
    COMM_STATE_PUBLISHED,
    COMM_STATE_QUEUED,
    COMM_STATE_READY,
    COMM_STATE_RETRY,
    COMM_STATE_SENDING,
    COMM_STATE_SENT,
)
from business_audit.communication.enums import CommunicationChannel, CommunicationStrategy
from business_audit.communication.provider_registry import (
    map_delivery_channel_to_communication_channel,
    resolve_provider_for_channel,
)
from business_audit.communication.report.constants import (
    DOMAIN_DIAGNOSTICS,
    OPERATION_EXECUTE_SEND,
    OPERATION_MARK_FAILED,
    OPERATION_MARK_READY,
    OPERATION_PREPARE_DELIVERY,
    OPERATION_PORTAL_PUBLISH,
    OPERATION_RETRY_DELIVERY,
    OPERATION_WEBHOOK_RECEIVED,
    SERVICE_DELIVERY_TASK,
    SERVICE_REPORT_DELIVERY,
    SERVICE_REPORT_WORKFLOW,
)
from business_audit.communication.report.payload_builder import ReportCommunicationPayloadBuilder
from business_audit.communication.report.repository import ReportCommunicationAuditRepository
from business_audit.communication.types import CommunicationContext
from business_audit.domain.context import apply_workflow_context
from business_audit.domain.types import BusinessAuditResult
from business_audit.enums import (
    ActorType,
    BusinessAuditAction,
    BusinessResourceType,
    EventCategory,
    ExternalProvider,
    WorkflowOutcome,
    WorkflowStatus,
    WorkflowType,
)
from business_audit.services import BusinessAuditService

logger = logging.getLogger(__name__)

_CHANNEL_ACTIONS: dict[str, BusinessAuditAction] = {
    CommunicationChannel.WHATSAPP: BusinessAuditAction.REPORT_WHATSAPP_DELIVERY,
    CommunicationChannel.EMAIL: BusinessAuditAction.REPORT_EMAIL_DELIVERY,
    CommunicationChannel.SMS: BusinessAuditAction.REPORT_SMS_DELIVERY,
    CommunicationChannel.PORTAL: BusinessAuditAction.REPORT_PORTAL_DELIVERY,
}


class ReportCommunicationAuditService:
    """Translate report delivery lifecycle events into BusinessAuditService.record()."""

    _repository = ReportCommunicationAuditRepository()

    @classmethod
    def emit_report_ready(
        cls,
        *,
        ctx: CommunicationContext,
        organization_id: str | None = None,
        user=None,
        correlation_id: str | None = None,
        request_id: str | None = None,
    ) -> BusinessAuditResult | None:
        if cls._repository.has_action_for_communication(
            communication_id=ctx.communication_id,
            action=BusinessAuditAction.REPORT_READY,
        ):
            return None
        payload = ReportCommunicationPayloadBuilder.build_ready(ctx)
        return cls._record(
            action=BusinessAuditAction.REPORT_READY,
            event="Report ready for communication",
            ctx=ctx,
            workflow_instance_id=ctx.communication_id,
            user=user,
            actor_type=ActorType.ADMIN if user else ActorType.SYSTEM,
            status=WorkflowStatus.RUNNING,
            outcome=WorkflowOutcome.UNKNOWN,
            state_before=None,
            state_after=COMM_STATE_READY,
            service=SERVICE_REPORT_WORKFLOW,
            operation=OPERATION_MARK_READY,
            payload=payload,
            correlation_id=correlation_id,
            request_id=request_id,
            organization_id=organization_id,
        )

    @classmethod
    def emit_delivery_requested(
        cls,
        *,
        ctx: CommunicationContext,
        channel: str,
        queue_wait_ms: int = 0,
        organization_id: str | None = None,
        user=None,
        correlation_id: str | None = None,
        request_id: str | None = None,
    ) -> BusinessAuditResult | None:
        attempt_id = ctx.communication_attempt_id
        if not attempt_id:
            raise ValueError("communication_attempt_id required for delivery_requested")
        if cls._repository.has_action_for_attempt(
            communication_attempt_id=attempt_id,
            action=BusinessAuditAction.REPORT_DELIVERY_REQUESTED,
        ):
            return None
        channel_norm = map_delivery_channel_to_communication_channel(channel)
        state_before = cls._repository.current_macro_state(ctx.communication_id) or COMM_STATE_READY
        payload = ReportCommunicationPayloadBuilder.build_delivery_requested(
            ctx,
            channel=channel_norm,
            queue_wait_ms=queue_wait_ms,
        )
        return cls._record(
            action=BusinessAuditAction.REPORT_DELIVERY_REQUESTED,
            event="Report delivery requested",
            ctx=ctx,
            workflow_instance_id=attempt_id,
            user=user,
            actor_type=ActorType.ADMIN if user else ActorType.SYSTEM,
            status=WorkflowStatus.RUNNING,
            outcome=WorkflowOutcome.UNKNOWN,
            state_before=state_before,
            state_after=COMM_STATE_QUEUED,
            service=SERVICE_REPORT_DELIVERY,
            operation=OPERATION_PREPARE_DELIVERY,
            payload=payload,
            correlation_id=correlation_id,
            request_id=request_id,
            organization_id=organization_id,
            execution_time_ms=queue_wait_ms or None,
        )

    @classmethod
    def emit_whatsapp_delivery(
        cls,
        *,
        ctx: CommunicationContext,
        provider_reference: str | None = None,
        organization_id: str | None = None,
        user=None,
        **kwargs: Any,
    ) -> BusinessAuditResult | None:
        return cls._emit_channel_delivery(
            channel=CommunicationChannel.WHATSAPP,
            ctx=ctx,
            provider_reference=provider_reference,
            organization_id=organization_id,
            user=user,
            **kwargs,
        )

    @classmethod
    def emit_email_delivery(
        cls,
        *,
        ctx: CommunicationContext,
        provider_reference: str | None = None,
        organization_id: str | None = None,
        user=None,
        **kwargs: Any,
    ) -> BusinessAuditResult | None:
        return cls._emit_channel_delivery(
            channel=CommunicationChannel.EMAIL,
            ctx=ctx,
            provider_reference=provider_reference,
            organization_id=organization_id,
            user=user,
            **kwargs,
        )

    @classmethod
    def emit_sms_delivery(
        cls,
        *,
        ctx: CommunicationContext,
        provider_reference: str | None = None,
        organization_id: str | None = None,
        user=None,
        **kwargs: Any,
    ) -> BusinessAuditResult | None:
        return cls._emit_channel_delivery(
            channel=CommunicationChannel.SMS,
            ctx=ctx,
            provider_reference=provider_reference,
            organization_id=organization_id,
            user=user,
            **kwargs,
        )

    @classmethod
    def emit_portal_delivery(
        cls,
        *,
        ctx: CommunicationContext,
        organization_id: str | None = None,
        user=None,
        correlation_id: str | None = None,
        request_id: str | None = None,
    ) -> BusinessAuditResult | None:
        if cls._repository.has_action_for_communication(
            communication_id=ctx.communication_id,
            action=BusinessAuditAction.REPORT_PORTAL_DELIVERY,
        ):
            return None
        state_before = cls._repository.current_macro_state(ctx.communication_id) or COMM_STATE_QUEUED
        payload = ReportCommunicationPayloadBuilder.build_portal_delivery(ctx)
        return cls._record(
            action=BusinessAuditAction.REPORT_PORTAL_DELIVERY,
            event="Report portal delivery",
            ctx=ctx,
            workflow_instance_id=ctx.communication_id,
            user=user,
            actor_type=ActorType.SYSTEM,
            status=WorkflowStatus.COMPLETED,
            outcome=WorkflowOutcome.SUCCESS,
            state_before=state_before,
            state_after=COMM_STATE_PUBLISHED,
            service=SERVICE_REPORT_DELIVERY,
            operation=OPERATION_PORTAL_PUBLISH,
            payload=payload,
            correlation_id=correlation_id,
            request_id=request_id,
            organization_id=organization_id,
        )

    @classmethod
    def emit_delivery_failed(
        cls,
        *,
        ctx: CommunicationContext,
        channel: str,
        reason: str = "",
        error_classification: str | None = None,
        provider_reference: str | None = None,
        request_payload: Any = None,
        response_payload: Any = None,
        provider_latency_ms: int = 0,
        retry_delay_ms: int = 0,
        organization_id: str | None = None,
        user=None,
        correlation_id: str | None = None,
        request_id: str | None = None,
    ) -> BusinessAuditResult | None:
        attempt_id = ctx.communication_attempt_id
        if not attempt_id:
            raise ValueError("communication_attempt_id required for delivery_failed")
        if cls._repository.has_action_for_attempt(
            communication_attempt_id=attempt_id,
            action=BusinessAuditAction.REPORT_DELIVERY_FAILED,
        ):
            return None
        channel_norm = map_delivery_channel_to_communication_channel(channel)
        provider = resolve_provider_for_channel(channel_norm, simulated=True)
        state_before = (
            cls._repository.current_attempt_state(attempt_id)
            or cls._repository.current_macro_state(ctx.communication_id)
            or COMM_STATE_SENDING
        )
        payload = ReportCommunicationPayloadBuilder.build_delivery_failed(
            ctx,
            channel=channel_norm,
            provider=provider,
            reason=reason,
            error_classification=error_classification,
            provider_reference=provider_reference,
            request_payload=request_payload,
            response_payload=response_payload,
            provider_latency_ms=provider_latency_ms,
            retry_delay_ms=retry_delay_ms,
        )
        return cls._record(
            action=BusinessAuditAction.REPORT_DELIVERY_FAILED,
            event="Report delivery failed",
            ctx=ctx,
            workflow_instance_id=attempt_id,
            user=user,
            actor_type=ActorType.SYSTEM,
            status=WorkflowStatus.FAILED,
            outcome=WorkflowOutcome.FAILURE,
            state_before=state_before,
            state_after=COMM_STATE_FAILED,
            service=SERVICE_REPORT_DELIVERY,
            operation=OPERATION_MARK_FAILED,
            payload=payload,
            correlation_id=correlation_id,
            request_id=request_id,
            organization_id=organization_id,
            execution_time_ms=provider_latency_ms or None,
        )

    @classmethod
    def emit_delivery_retried(
        cls,
        *,
        ctx: CommunicationContext,
        previous_channel: str,
        new_channel: str,
        previous_error: str,
        parent_attempt_id: str,
        communication_strategy: str = CommunicationStrategy.FALLBACK,
        selection_reason: str = "",
        organization_id: str | None = None,
        user=None,
        correlation_id: str | None = None,
        request_id: str | None = None,
    ) -> BusinessAuditResult | None:
        if cls._repository.has_retry_for_parent(
            parent_attempt_id=parent_attempt_id,
            retry_number=ctx.attempt_number,
        ):
            return None
        state_before = COMM_STATE_FAILED
        timeline = cls._repository.reconstruct_attempt_timeline(ctx.communication_id)
        payload = ReportCommunicationPayloadBuilder.build_delivery_retried(
            ctx,
            previous_channel=map_delivery_channel_to_communication_channel(previous_channel),
            new_channel=map_delivery_channel_to_communication_channel(new_channel),
            previous_error=previous_error,
            parent_attempt_id=parent_attempt_id,
            communication_strategy=communication_strategy,
            selection_reason=selection_reason,
            attempt_timeline=timeline,
        )
        attempt_id = ctx.communication_attempt_id or parent_attempt_id
        return cls._record(
            action=BusinessAuditAction.REPORT_DELIVERY_RETRIED,
            event="Report delivery retried",
            ctx=ctx,
            workflow_instance_id=attempt_id,
            user=user,
            actor_type=ActorType.ADMIN if user else ActorType.SYSTEM,
            status=WorkflowStatus.RETRYING,
            outcome=WorkflowOutcome.UNKNOWN,
            state_before=state_before,
            state_after=COMM_STATE_RETRY,
            service=SERVICE_REPORT_DELIVERY,
            operation=OPERATION_RETRY_DELIVERY,
            payload=payload,
            correlation_id=correlation_id,
            request_id=request_id,
            organization_id=organization_id,
        )

    @classmethod
    def emit_webhook_received(
        cls,
        *,
        communication_id: str,
        communication_attempt_id: str,
        provider: str,
        provider_reference: str,
        webhook_event_type: str,
        new_status: str,
        organization_id: str,
        correlation_id: str | None = None,
        request_id: str | None = None,
    ) -> BusinessAuditResult | None:
        """Stub for future provider webhook callbacks."""
        dedup_key = f"{provider_reference}:{webhook_event_type}"
        existing = cls._repository.get_by_provider_reference(dedup_key)
        if existing:
            return None
        payload = ReportCommunicationPayloadBuilder.build_webhook_received(
            communication_id=communication_id,
            communication_attempt_id=communication_attempt_id,
            provider=provider,
            provider_reference=provider_reference,
            webhook_event_type=webhook_event_type,
            new_status=new_status,
        )
        ctx = CommunicationContext(
            communication_id=communication_id,
            communication_type="REPORT",
            communication_attempt_id=communication_attempt_id,
        )
        return cls._record(
            action=BusinessAuditAction.COMMUNICATION_WEBHOOK_RECEIVED,
            event="Communication webhook received",
            ctx=ctx,
            workflow_instance_id=communication_attempt_id,
            user=None,
            actor_type=ActorType.SYSTEM,
            status=WorkflowStatus.COMPLETED,
            outcome=WorkflowOutcome.SUCCESS,
            state_before=COMM_STATE_DELIVERED,
            state_after=new_status,
            service=SERVICE_DELIVERY_TASK,
            operation=OPERATION_WEBHOOK_RECEIVED,
            payload=payload,
            correlation_id=correlation_id,
            request_id=request_id,
            organization_id=organization_id,
            provider_reference=dedup_key,
        )

    @classmethod
    def _emit_channel_delivery(
        cls,
        *,
        channel: str,
        ctx: CommunicationContext,
        provider_reference: str | None = None,
        communication_strategy: str = CommunicationStrategy.PRIMARY,
        selection_reason: str = "Primary channel policy",
        request_payload: Any = None,
        response_payload: Any = None,
        queue_wait_ms: int = 0,
        provider_latency_ms: int = 0,
        total_delivery_ms: int = 0,
        organization_id: str | None = None,
        user=None,
        correlation_id: str | None = None,
        request_id: str | None = None,
    ) -> BusinessAuditResult | None:
        attempt_id = ctx.communication_attempt_id
        if not attempt_id:
            raise ValueError("communication_attempt_id required for channel delivery")
        channel_norm = map_delivery_channel_to_communication_channel(channel)
        action = _CHANNEL_ACTIONS.get(channel_norm, BusinessAuditAction.REPORT_WHATSAPP_DELIVERY)
        if provider_reference and cls._repository.has_channel_delivery_for_attempt(
            communication_attempt_id=attempt_id,
            provider_reference=provider_reference,
        ):
            return None
        provider = resolve_provider_for_channel(channel_norm, simulated=True)
        state_before = (
            cls._repository.current_attempt_state(attempt_id) or COMM_STATE_SENDING
        )
        timeline = cls._repository.reconstruct_attempt_timeline(ctx.communication_id)
        payload = ReportCommunicationPayloadBuilder.build_channel_delivery(
            ctx,
            channel=channel_norm,
            provider=provider,
            provider_reference=provider_reference,
            communication_strategy=communication_strategy,
            selection_reason=selection_reason,
            request_payload=request_payload,
            response_payload=response_payload,
            queue_wait_ms=queue_wait_ms,
            provider_latency_ms=provider_latency_ms,
            total_delivery_ms=total_delivery_ms,
            attempt_timeline=timeline,
        )
        return cls._record(
            action=action,
            event=f"Report {channel_norm.lower()} delivery",
            ctx=ctx,
            workflow_instance_id=attempt_id,
            user=user,
            actor_type=ActorType.SYSTEM,
            status=WorkflowStatus.COMPLETED,
            outcome=WorkflowOutcome.SUCCESS,
            state_before=state_before,
            state_after=COMM_STATE_DELIVERED,
            service=SERVICE_REPORT_DELIVERY,
            operation=OPERATION_EXECUTE_SEND,
            payload=payload,
            correlation_id=correlation_id,
            request_id=request_id,
            organization_id=organization_id,
            execution_time_ms=total_delivery_ms or provider_latency_ms or None,
            provider_reference=provider_reference,
            external_provider=ExternalProvider.INTERNAL,
        )

    @classmethod
    def _record(
        cls,
        *,
        action: BusinessAuditAction,
        event: str,
        ctx: CommunicationContext,
        workflow_instance_id: str,
        actor_type: ActorType,
        status: WorkflowStatus,
        outcome: WorkflowOutcome,
        domain: str = DOMAIN_DIAGNOSTICS,
        service: str,
        operation: str,
        payload: dict[str, Any],
        state_before: str | None = None,
        state_after: str | None = None,
        organization_id: str | None = None,
        user=None,
        correlation_id: str | None = None,
        request_id: str | None = None,
        execution_time_ms: int | None = None,
        provider_reference: str | None = None,
        external_provider: ExternalProvider = ExternalProvider.INTERNAL,
    ) -> BusinessAuditResult:
        user_id = None
        if user is not None and getattr(user, "is_authenticated", False):
            user_id = str(getattr(user, "pk", ""))

        parent_workflow_instance_id = (
            ctx.routing_id or ctx.booking_id or ctx.recommendation_id
        )
        apply_workflow_context(workflow_instance_id=workflow_instance_id)

        resolved_org_id = organization_id or payload.get("organization_id")
        if not resolved_org_id:
            raise ValueError("organization_id is required for report communication audit")

        return BusinessAuditService.record(
            action=action,
            event=event,
            workflow_type=WorkflowType.REPORT_DELIVERY,
            workflow_instance_id=workflow_instance_id,
            parent_workflow_instance_id=str(parent_workflow_instance_id)
            if parent_workflow_instance_id
            else None,
            category=EventCategory.DELIVERY,
            domain=domain,
            service=service,
            operation=operation,
            resource_type=BusinessResourceType.COMMUNICATION,
            resource_id=ctx.communication_id,
            organization_id=str(resolved_org_id),
            status=status,
            outcome=outcome,
            actor_type=actor_type,
            state_before=state_before,
            state_after=state_after,
            user_id=user_id,
            payload=payload,
            correlation_id=correlation_id,
            request_id=request_id,
            execution_time_ms=execution_time_ms,
            provider_reference=provider_reference,
            external_provider=external_provider,
        )

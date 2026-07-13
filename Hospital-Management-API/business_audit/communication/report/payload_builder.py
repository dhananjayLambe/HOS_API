"""Build report communication audit event payloads."""

from __future__ import annotations

from typing import Any

from business_audit.communication.constants import (
    AVAILABLE_CHANNELS_DEFAULT,
    FALLBACK_ORDER_DEFAULT,
)
from business_audit.communication.snapshot_builder import (
    build_channel_selection_snapshot,
    build_communication_decision_snapshot,
    build_delivery_metrics,
    build_provider_response_snapshot,
)
from business_audit.communication.types import CommunicationContext


class ReportCommunicationPayloadBuilder:
    """Construct report delivery payloads with CommunicationContext."""

    @staticmethod
    def _merge_context(
        ctx: CommunicationContext,
        *,
        extra: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        payload = ctx.to_dict()
        if extra:
            payload.update(extra)
        return payload

    @classmethod
    def build_ready(cls, ctx: CommunicationContext) -> dict[str, Any]:
        return cls._merge_context(ctx, extra={"stage": "ready"})

    @classmethod
    def build_delivery_requested(
        cls,
        ctx: CommunicationContext,
        *,
        channel: str,
        queue_wait_ms: int = 0,
    ) -> dict[str, Any]:
        return cls._merge_context(
            ctx,
            extra={
                "stage": "delivery_requested",
                "selected_channel": channel,
                "available_channels": list(AVAILABLE_CHANNELS_DEFAULT),
                "fallback_order": list(FALLBACK_ORDER_DEFAULT),
                "timings_ms": build_delivery_metrics(queue_wait_ms=queue_wait_ms),
            },
        )

    @classmethod
    def build_channel_delivery(
        cls,
        ctx: CommunicationContext,
        *,
        channel: str,
        provider: str,
        provider_reference: str | None = None,
        communication_strategy: str = "PRIMARY",
        selection_reason: str = "Primary channel policy",
        provider_response: str = "accepted",
        request_payload: Any = None,
        response_payload: Any = None,
        queue_wait_ms: int = 0,
        provider_latency_ms: int = 0,
        total_delivery_ms: int = 0,
        attempt_timeline: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        attempt_id = ctx.communication_attempt_id or ""
        decision = build_communication_decision_snapshot(
            communication_attempt_id=attempt_id,
            communication_id=ctx.communication_id,
            attempt_number=ctx.attempt_number,
            selected_channel=channel,
            provider=provider,
            provider_response=provider_response,
            communication_strategy=communication_strategy,
            selection_reason=selection_reason,
        )
        provider_snap = build_provider_response_snapshot(
            provider=provider,
            provider_reference=provider_reference,
            http_status=200,
            provider_code=provider_response,
            provider_message="Channel delivery accepted",
            request_payload=request_payload,
            response_payload=response_payload,
            latency_ms=provider_latency_ms,
        )
        extra: dict[str, Any] = {
            "stage": "channel_delivery",
            "selected_channel": channel,
            "decision_snapshot": decision,
            "provider_response_snapshot": provider_snap,
            "timings_ms": build_delivery_metrics(
                queue_wait_ms=queue_wait_ms,
                provider_latency_ms=provider_latency_ms,
                total_delivery_ms=total_delivery_ms,
            ),
        }
        if attempt_timeline:
            extra["attempt_timeline"] = attempt_timeline
        return cls._merge_context(ctx, extra=extra)

    @classmethod
    def build_portal_delivery(
        cls,
        ctx: CommunicationContext,
        *,
        provider: str = "INTERNAL",
    ) -> dict[str, Any]:
        return cls._merge_context(
            ctx,
            extra={
                "stage": "portal_delivery",
                "selected_channel": "PORTAL",
                "provider": provider,
            },
        )

    @classmethod
    def build_delivery_failed(
        cls,
        ctx: CommunicationContext,
        *,
        channel: str,
        provider: str,
        reason: str = "",
        error_classification: str | None = None,
        provider_reference: str | None = None,
        request_payload: Any = None,
        response_payload: Any = None,
        provider_latency_ms: int = 0,
        retry_delay_ms: int = 0,
    ) -> dict[str, Any]:
        provider_snap = build_provider_response_snapshot(
            provider=provider,
            provider_reference=provider_reference,
            http_status=500,
            provider_code="failed",
            provider_message=reason or "delivery_failed",
            request_payload=request_payload,
            response_payload=response_payload,
            error_classification=error_classification or "provider_error",
            latency_ms=provider_latency_ms,
        )
        return cls._merge_context(
            ctx,
            extra={
                "stage": "delivery_failed",
                "selected_channel": channel,
                "failure_reason": reason,
                "provider_response_snapshot": provider_snap,
                "timings_ms": build_delivery_metrics(
                    provider_latency_ms=provider_latency_ms,
                    retry_delay_ms=retry_delay_ms,
                ),
            },
        )

    @classmethod
    def build_delivery_retried(
        cls,
        ctx: CommunicationContext,
        *,
        previous_channel: str,
        new_channel: str,
        previous_error: str,
        parent_attempt_id: str,
        communication_strategy: str = "FALLBACK",
        selection_reason: str = "",
        attempt_timeline: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        channel_snap = build_channel_selection_snapshot(
            selected_channel=new_channel,
            previous_channel=previous_channel,
            previous_error=previous_error,
            communication_strategy=communication_strategy,
            selection_reason=selection_reason
            or f"{previous_channel} attempt failed; sequential fallback",
        )
        extra: dict[str, Any] = {
            "stage": "delivery_retried",
            "parent_communication_attempt_id": parent_attempt_id,
            "channel_selection_snapshot": channel_snap,
        }
        if attempt_timeline:
            extra["attempt_timeline"] = attempt_timeline
        return cls._merge_context(ctx, extra=extra)

    @classmethod
    def build_webhook_received(
        cls,
        *,
        communication_id: str,
        communication_attempt_id: str,
        provider: str,
        provider_reference: str,
        webhook_event_type: str,
        new_status: str,
    ) -> dict[str, Any]:
        return {
            "communication_id": communication_id,
            "communication_attempt_id": communication_attempt_id,
            "provider": provider,
            "provider_reference": provider_reference,
            "webhook_event_type": webhook_event_type,
            "new_status": new_status,
            "stage": "webhook_received",
        }

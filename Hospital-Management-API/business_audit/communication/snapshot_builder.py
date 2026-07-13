"""Build communication audit snapshot payloads."""

from __future__ import annotations

import hashlib
import json
from typing import Any

from business_audit.communication.constants import (
    AVAILABLE_CHANNELS_DEFAULT,
    FALLBACK_ORDER_DEFAULT,
)
from business_audit.communication.enums import CommunicationStrategy
from business_audit.communication.types import (
    ChannelSelectionSnapshot,
    CommunicationDecisionSnapshot,
    DeliveryMetrics,
    ProviderResponseSnapshot,
)


def hash_payload(data: Any) -> str | None:
    if data is None:
        return None
    try:
        if isinstance(data, str):
            raw = data
        else:
            raw = json.dumps(data, sort_keys=True, default=str)
        digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()
        return f"sha256:{digest}"
    except Exception:
        return None


def build_provider_response_snapshot(
    *,
    provider: str,
    provider_reference: str | None = None,
    http_status: int | None = None,
    provider_code: str | None = None,
    provider_message: str | None = None,
    request_payload: Any = None,
    response_payload: Any = None,
    error_classification: str | None = None,
    latency_ms: int | None = None,
) -> dict[str, Any]:
    snap = ProviderResponseSnapshot(
        provider=provider,
        provider_reference=provider_reference,
        http_status=http_status,
        provider_code=provider_code,
        provider_message=provider_message,
        request_payload_hash=hash_payload(request_payload),
        response_payload_hash=hash_payload(response_payload),
        error_classification=error_classification,
        latency_ms=latency_ms,
    )
    return snap.to_dict()


def build_channel_selection_snapshot(
    *,
    selected_channel: str,
    previous_channel: str | None = None,
    previous_error: str | None = None,
    communication_strategy: str = CommunicationStrategy.FALLBACK,
    fallback_order: list[str] | None = None,
    selection_reason: str = "",
) -> dict[str, Any]:
    snap = ChannelSelectionSnapshot(
        selected_channel=selected_channel,
        previous_channel=previous_channel,
        previous_error=previous_error,
        communication_strategy=communication_strategy,
        fallback_order=fallback_order or list(FALLBACK_ORDER_DEFAULT),
        selection_reason=selection_reason,
    )
    return snap.to_dict()


def build_communication_decision_snapshot(
    *,
    communication_attempt_id: str,
    communication_id: str,
    attempt_number: int,
    selected_channel: str,
    provider: str,
    provider_response: str = "accepted",
    available_channels: list[str] | None = None,
    fallback_order: list[str] | None = None,
    selection_reason: str = "Primary channel policy",
    policy: str = "PRIMARY",
    communication_strategy: str = CommunicationStrategy.PRIMARY,
    delivery_reason: str = "",
) -> dict[str, Any]:
    snap = CommunicationDecisionSnapshot(
        communication_attempt_id=communication_attempt_id,
        communication_id=communication_id,
        attempt_number=attempt_number,
        selected_channel=selected_channel,
        available_channels=available_channels or list(AVAILABLE_CHANNELS_DEFAULT),
        fallback_order=fallback_order or list(FALLBACK_ORDER_DEFAULT),
        selection_reason=selection_reason,
        policy=policy,
        communication_strategy=communication_strategy,
        provider=provider,
        provider_response=provider_response,
        delivery_reason=delivery_reason or "Channel delivery succeeded",
    )
    return snap.to_dict()


def build_delivery_metrics(
    *,
    queue_wait_ms: int = 0,
    provider_latency_ms: int = 0,
    total_delivery_ms: int = 0,
    retry_delay_ms: int = 0,
) -> dict[str, Any]:
    return DeliveryMetrics(
        queue_wait_ms=queue_wait_ms,
        provider_latency_ms=provider_latency_ms,
        total_delivery_ms=total_delivery_ms,
        retry_delay_ms=retry_delay_ms,
    ).to_dict()

"""Typed structures for Communication Audit payloads."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass
class DeliveryMetrics:
    queue_wait_ms: int = 0
    provider_latency_ms: int = 0
    total_delivery_ms: int = 0
    retry_delay_ms: int = 0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class AttemptTimelineEntry:
    attempt_number: int
    channel: str
    status: str
    communication_attempt_id: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class ProviderResponseSnapshot:
    provider: str
    provider_reference: str | None = None
    http_status: int | None = None
    provider_code: str | None = None
    provider_message: str | None = None
    request_payload_hash: str | None = None
    response_payload_hash: str | None = None
    error_classification: str | None = None
    latency_ms: int | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class ChannelSelectionSnapshot:
    selected_channel: str
    previous_channel: str | None = None
    previous_error: str | None = None
    communication_strategy: str = "PRIMARY"
    fallback_order: list[str] = field(default_factory=list)
    selection_reason: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class CommunicationDecisionSnapshot:
    communication_attempt_id: str
    communication_id: str
    attempt_number: int
    selected_channel: str
    available_channels: list[str] = field(default_factory=list)
    fallback_order: list[str] = field(default_factory=list)
    selection_reason: str = ""
    policy: str = "PRIMARY"
    communication_strategy: str = "PRIMARY"
    provider: str = "INTERNAL"
    provider_response: str = ""
    delivery_reason: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class CommunicationContext:
    communication_id: str
    communication_type: str
    communication_attempt_id: str | None = None
    attempt_number: int = 1
    artifact_type: str | None = None
    artifact_version: int | None = None
    artifact_size_bytes: int | None = None
    mime_type: str | None = None
    report_id: str | None = None
    booking_id: str | None = None
    routing_id: str | None = None
    recommendation_id: str | None = None
    patient_account_id: str | None = None
    consultation_id: str | None = None
    recipient: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

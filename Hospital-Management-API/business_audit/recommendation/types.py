"""Types for recommendation business audit."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass(frozen=True)
class RecommendationAuditContext:
    recommendation_id: str
    consultation_id: str
    organization_id: str
    patient_account_id: str | None = None
    patient_profile_id: str | None = None
    encounter_id: str | None = None
    operational_stage: str = "generation"
    source_path: str | None = None
    user_id: str | None = None
    correlation_id: str | None = None
    request_id: str | None = None
    expires_at: str | None = None
    whatsapp_message_id: str | None = None
    meta_message_id: str | None = None
    provider_response_code: str | None = None
    provider_response_message: str | None = None
    failure_reason: str | None = None
    retry_count: int = 0
    max_retry: int | None = None
    retry_reason: str | None = None
    execution_time_ms: int | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None
    extra: dict[str, Any] | None = None

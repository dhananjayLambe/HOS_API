"""API envelope and metadata contracts."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass(frozen=True)
class PaginationMetadata:
    cursor: str | None
    limit: int
    has_more: bool


@dataclass(frozen=True)
class InvestigationMetadata:
    investigation_id: str
    duration_ms: float
    generated_at: datetime | None
    api_version: str
    investigation_level: str
    correlation_id: str | None
    partial: bool
    scope: str


@dataclass(frozen=True)
class ErrorResponse:
    code: str
    message: str


@dataclass(frozen=True)
class ApiEnvelope:
    success: bool
    request_id: str
    data: Any
    metadata: InvestigationMetadata | None = None
    error: ErrorResponse | None = None
    pagination: PaginationMetadata | None = None

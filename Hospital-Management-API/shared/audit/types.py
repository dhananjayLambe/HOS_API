"""Shared types for audit service layers."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID


@dataclass(frozen=True)
class BaseAuditRecordResult:
    """Structured outcome from an audit service record() call."""

    success: bool
    correlation_id: str
    audit_id: UUID | None = None
    error: str | None = None
    error_type: str | None = None
    extra: dict[str, Any] | None = None

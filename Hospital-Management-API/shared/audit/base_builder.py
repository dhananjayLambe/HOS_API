"""Shared builder patterns for audit frameworks."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from shared.audit.envelope import build_new_value_envelope
from shared.logging.context import LogContext, get_context_manager


class BaseAuditBuilder:
    """Common context resolution and envelope assembly for audit builders."""

    @staticmethod
    def get_context() -> LogContext:
        return get_context_manager().get()

    @staticmethod
    def resolve_correlation_id(
        explicit: str | None,
        *,
        context: LogContext | None = None,
    ) -> str:
        ctx = context or get_context_manager().get()
        if explicit and str(explicit).strip():
            return str(explicit).strip()
        if ctx.correlation_id:
            return ctx.correlation_id
        return str(uuid.uuid4())

    @staticmethod
    def resolve_request_id(
        explicit: str | None = None,
        *,
        context: LogContext | None = None,
    ) -> str | None:
        if explicit is not None:
            normalized = str(explicit).strip()
            return normalized or None
        ctx = context or get_context_manager().get()
        return ctx.request_id

    @staticmethod
    def build_payload_envelope(
        *,
        organization_id: str,
        payload: dict[str, Any] | None,
        request_id: str | None = None,
        occurred_at: datetime | None = None,
        service_name: str | None = None,
        environment: str | None = None,
        deployment: str | None = None,
        tenant: str | None = None,
        meta_extra: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        return build_new_value_envelope(
            organization_id=organization_id,
            payload=payload,
            request_id=request_id,
            occurred_at=occurred_at,
            service_name=service_name,
            environment=environment,
            deployment=deployment,
            tenant=tenant,
            meta_extra=meta_extra,
        )

"""Trace context helpers — reuse LogContext correlation infrastructure."""

from __future__ import annotations

from typing import Any

from shared.logging.context import LogContext, get_context_manager

from support_trace.domain.lookup_keys import _LOG_CONTEXT_IDENTIFIER_MAP


def resolve_trace_context(
    *,
    workflow_instance_id: str | None = None,
    parent_workflow_instance_id: str | None = None,
    correlation_id: str | None = None,
    request_id: str | None = None,
    context: LogContext | None = None,
) -> dict[str, str | None]:
    """Merge explicit trace fields with active LogContext."""
    ctx = context or get_context_manager().get()
    return {
        "workflow_instance_id": workflow_instance_id or ctx.workflow_instance_id,
        "parent_workflow_instance_id": (
            parent_workflow_instance_id or ctx.parent_workflow_instance_id
        ),
        "correlation_id": correlation_id or ctx.correlation_id,
        "request_id": request_id or ctx.request_id,
    }


def context_identifier_values(context: LogContext | None = None) -> dict[str, str | None]:
    ctx = context or get_context_manager().get()
    values: dict[str, str | None] = {}
    for trace_field, ctx_field in _LOG_CONTEXT_IDENTIFIER_MAP.items():
        values[trace_field] = getattr(ctx, ctx_field, None)
    return values


def apply_trace_context(**fields: Any) -> None:
    """Update LogContext with trace propagation fields."""
    get_context_manager().update(**fields)

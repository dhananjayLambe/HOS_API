"""Workflow context helpers for Business Audit."""

from __future__ import annotations

import uuid
from typing import Any

from django.conf import settings

from business_audit.domain.repository import BusinessAuditRepository
from shared.logging.context import LogContext, get_context_manager


def generate_workflow_instance_id() -> str:
    """Return a new workflow execution instance identifier."""
    return str(uuid.uuid4())


def resolve_workflow_context(
    *,
    workflow_instance_id: str | None = None,
    parent_workflow_instance_id: str | None = None,
    correlation_id: str | None = None,
    request_id: str | None = None,
    tenant: str | None = None,
    environment: str | None = None,
    deployment: str | None = None,
    context: LogContext | None = None,
) -> dict[str, str | None]:
    """Merge explicit workflow fields with active LogContext."""
    ctx = context or get_context_manager().get()
    return {
        "workflow_instance_id": workflow_instance_id or ctx.workflow_instance_id,
        "parent_workflow_instance_id": (
            parent_workflow_instance_id or ctx.parent_workflow_instance_id
        ),
        "correlation_id": correlation_id or ctx.correlation_id,
        "request_id": request_id or ctx.request_id,
        "tenant": tenant or ctx.tenant,
        "environment": environment
        or ctx.environment
        or getattr(settings, "ENVIRONMENT", None),
        "deployment": deployment
        or ctx.deployment
        or getattr(settings, "APPLICATION_VERSION", None),
    }


def next_sequence_no(
    workflow_instance_id: str,
    *,
    repository: BusinessAuditRepository | None = None,
) -> int:
    """Return the next monotonic sequence number for a workflow instance."""
    repo = repository or BusinessAuditRepository()
    return repo.max_sequence_no(workflow_instance_id) + 1


def apply_workflow_context(**fields: Any) -> None:
    """Update LogContext with workflow propagation fields."""
    get_context_manager().update(**fields)

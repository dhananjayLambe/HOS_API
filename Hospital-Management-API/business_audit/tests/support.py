"""Shared test helpers for Business Audit."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from business_audit.enums import (
    ActorType,
    BusinessAuditAction,
    BusinessResourceType,
    EventCategory,
    WorkflowOutcome,
    WorkflowStatus,
    WorkflowType,
)
from business_audit.services import BusinessAuditService
from shared.logging.context import LogContext, get_context_manager
from tests.factories.clinic import ClinicFactory


def setup_business_audit_context(
    *,
    correlation_id: str | None = None,
    workflow_instance_id: str | None = None,
    parent_workflow_instance_id: str | None = None,
) -> tuple:
    clinic = ClinicFactory()
    correlation_id = correlation_id or str(uuid.uuid4())
    workflow_instance_id = workflow_instance_id or str(uuid.uuid4())
    get_context_manager().set(
        LogContext(
            correlation_id=correlation_id,
            request_id="req-business-audit",
            user_id="USR-BA-001",
            workflow_instance_id=workflow_instance_id,
            parent_workflow_instance_id=parent_workflow_instance_id,
            environment="test",
            deployment="test-build",
        )
    )
    return clinic, correlation_id, workflow_instance_id


def record_workflow_event(
    clinic,
    workflow_instance_id: str,
    *,
    action: BusinessAuditAction = BusinessAuditAction.WORKFLOW_STARTED,
    event: str = "Workflow started",
    status: WorkflowStatus = WorkflowStatus.STARTED,
    outcome: WorkflowOutcome = WorkflowOutcome.UNKNOWN,
    state_before: str | None = None,
    state_after: str | None = "Started",
    sequence_no: int | None = None,
    parent_workflow_instance_id: str | None = None,
    correlation_id: str | None = None,
    **overrides,
):
    kwargs = {
        "action": action,
        "event": event,
        "workflow_type": WorkflowType.NOTIFICATION,
        "workflow_instance_id": workflow_instance_id,
        "category": EventCategory.NOTIFICATION,
        "domain": "notifications",
        "service": "WhatsAppService",
        "operation": "send_message",
        "resource_type": BusinessResourceType.MESSAGE,
        "resource_id": str(uuid.uuid4()),
        "organization_id": str(clinic.id),
        "status": status,
        "outcome": outcome,
        "actor_type": ActorType.SYSTEM,
        "state_before": state_before,
        "state_after": state_after,
        "sequence_no": sequence_no,
        "parent_workflow_instance_id": parent_workflow_instance_id,
        "correlation_id": correlation_id,
        "validate_references": True,
    }
    kwargs.update(overrides)
    return BusinessAuditService.record(**kwargs)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)

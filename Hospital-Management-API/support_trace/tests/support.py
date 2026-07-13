"""Shared test helpers for Support Trace."""

from __future__ import annotations

import uuid

from business_audit.enums import BusinessResourceType, WorkflowType
from shared.logging.context import LogContext, get_context_manager
from support_trace.enums import TraceStatus
from support_trace.services.support_trace_service import SupportTraceService
from tests.factories.clinic import ClinicFactory


def setup_trace_context(
    *,
    correlation_id: str | None = None,
    workflow_instance_id: str | None = None,
    parent_workflow_instance_id: str | None = None,
    booking_id: str | None = None,
    patient_account_id: str | None = None,
) -> tuple:
    clinic = ClinicFactory()
    correlation_id = correlation_id or str(uuid.uuid4())
    workflow_instance_id = workflow_instance_id or str(uuid.uuid4())
    get_context_manager().set(
        LogContext(
            correlation_id=correlation_id,
            request_id="req-support-trace",
            workflow_instance_id=workflow_instance_id,
            parent_workflow_instance_id=parent_workflow_instance_id,
            booking_id=booking_id,
            patient_account_id=patient_account_id,
            environment="test",
            deployment="test-build",
        )
    )
    return clinic, correlation_id, workflow_instance_id


def record_trace_event(
    clinic,
    workflow_instance_id: str,
    *,
    correlation_id: str | None = None,
    status: TraceStatus = TraceStatus.RUNNING,
    last_event: str = "workflow.started",
    **overrides,
):
    kwargs = {
        "workflow_instance_id": workflow_instance_id,
        "workflow_type": WorkflowType.BOOKING,
        "resource_type": BusinessResourceType.BOOKING,
        "resource_id": str(uuid.uuid4()),
        "organization_id": str(clinic.id),
        "status": status,
        "last_event": last_event,
        "correlation_id": correlation_id,
        "validate_references": True,
    }
    kwargs.update(overrides)
    return SupportTraceService.record(**kwargs)

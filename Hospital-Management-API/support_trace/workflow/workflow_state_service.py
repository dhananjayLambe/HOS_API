"""Maintains current workflow state on Support Trace projections."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from support_trace.constants import PROJECTION_VERSION
from support_trace.domain.repository import SupportTraceRepository
from support_trace.domain.types import SupportTraceResult
from support_trace.enums import TERMINAL_TRACE_STATUSES, TraceSource, TraceStatus
from support_trace.services.support_trace_service import SupportTraceService
from support_trace.workflow.types import WorkflowStateTransition, ResolvedWorkflow

logger = logging.getLogger(__name__)


class WorkflowStateService:
    """Public API for updating mutable workflow projection state."""

    _repository = SupportTraceRepository()

    @classmethod
    def update_workflow_state(
        cls,
        *,
        resolved: ResolvedWorkflow,
        transition: WorkflowStateTransition,
        last_source: TraceSource | str,
        last_clinical_audit_id: UUID | None = None,
        last_business_audit_id: UUID | None = None,
        raise_on_failure: bool = False,
    ) -> SupportTraceResult:
        existing = cls._repository.get_by_workflow(resolved.workflow_instance_id)
        event_at = resolved.event_at or datetime.now(timezone.utc)

        retry_count = existing.retry_count if existing else 0
        if transition.increment_retry:
            retry_count = retry_count + 1

        snapshot = dict(existing.current_snapshot or {}) if existing else {}
        if transition.snapshot_patch:
            snapshot.update(transition.snapshot_patch)
        if resolved.payload:
            for key in (
                "retry_reason",
                "assigned_lab",
                "current_channel",
                "booking_status",
            ):
                if key in resolved.payload and resolved.payload[key] is not None:
                    snapshot[key] = resolved.payload[key]
        if transition.increment_retry:
            snapshot["retry_count"] = retry_count

        completed_at = None
        if transition.finalize_duration or transition.trace_status in TERMINAL_TRACE_STATUSES:
            if transition.trace_status == TraceStatus.COMPLETED:
                completed_at = event_at
            elif transition.finalize_duration:
                completed_at = event_at if transition.trace_status == TraceStatus.COMPLETED else None

        # Force duration finalization for all terminal statuses via status
        status = transition.trace_status

        result = SupportTraceService.record(
            workflow_instance_id=resolved.workflow_instance_id,
            workflow_type=resolved.workflow_type,
            resource_type=resolved.resource_type,
            resource_id=resolved.resource_id,
            organization_id=resolved.organization_id,
            status=status,
            last_event=resolved.last_event or transition.workflow_step,
            last_source=last_source,
            workflow_step=transition.workflow_step,
            current_state=transition.current_state,
            last_sequence_no=resolved.last_sequence_no,
            parent_workflow_instance_id=resolved.parent_workflow_instance_id,
            workflow_depth=resolved.workflow_depth,
            identifiers=resolved.identifiers or None,
            correlation_id=resolved.correlation_id,
            request_id=resolved.request_id,
            event_at=event_at,
            completed_at=completed_at,
            retry_count=retry_count,
            last_clinical_audit_id=last_clinical_audit_id,
            last_business_audit_id=last_business_audit_id,
            current_snapshot=snapshot,
            first_seen_at=resolved.first_seen_at,
            last_seen_at=resolved.last_seen_at,
            identifier_count=resolved.identifier_count,
            finalize_duration=transition.finalize_duration
            or status in TERMINAL_TRACE_STATUSES,
            projection_version=PROJECTION_VERSION,
            allow_status_regression=transition.allow_regression,
            raise_on_failure=raise_on_failure,
            validate_references=False,
        )
        return result

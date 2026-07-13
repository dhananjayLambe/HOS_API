"""Synchronization-only layer: SyncEvent → WorkflowStateService."""

from __future__ import annotations

import logging
from uuid import UUID

from support_trace.domain.sync_event import SupportTraceSyncEvent
from support_trace.domain.types import SupportTraceResult
from support_trace.enums import SyncStatus, TraceSource
from support_trace.exceptions import WorkflowTransitionError
from support_trace.domain.repository import SupportTraceRepository
from support_trace.identifiers.identifier_sync_service import IdentifierSyncService
from support_trace.workflow.registries import resolve_transition
from support_trace.workflow.resolvers import WorkflowResolver
from support_trace.workflow.transition_validator import WorkflowTransitionValidator
from support_trace.workflow.types import ResolvedWorkflow
from support_trace.workflow.workflow_state_service import WorkflowStateService

logger = logging.getLogger(__name__)


class WorkflowSyncService:
    """Consumes SupportTraceSyncEvent and updates Support Trace. No business logic."""

    _repository = SupportTraceRepository()

    @classmethod
    def sync(
        cls,
        event: SupportTraceSyncEvent,
        *,
        raise_on_failure: bool = False,
    ) -> SupportTraceResult:
        action = event.action or event.last_event
        transition = resolve_transition(
            action,
            workflow_type=event.workflow_type,
            source=event.source,
        )
        if transition is None:
            logger.debug(
                "support_trace_sync_skipped_unmapped_action",
                extra={
                    "action": action,
                    "workflow_type": event.workflow_type,
                    "audit_id": event.audit_id,
                },
            )
            return SupportTraceResult(
                success=True,
                correlation_id=event.correlation_id or event.workflow_instance_id,
                workflow_instance_id=event.workflow_instance_id,
                sync_status=SyncStatus.INDEXED,
                created=False,
            )

        resolved = WorkflowResolver.resolve_from_sync_event(event)
        existing = cls._repository.get_by_workflow(resolved.workflow_instance_id)
        sync_result = IdentifierSyncService.sync(
            event,
            resolved=resolved,
            existing=existing,
        )
        resolved = ResolvedWorkflow(
            workflow_instance_id=resolved.workflow_instance_id,
            workflow_type=resolved.workflow_type,
            resource_type=resolved.resource_type,
            resource_id=resolved.resource_id,
            organization_id=resolved.organization_id,
            parent_workflow_instance_id=resolved.parent_workflow_instance_id,
            workflow_depth=resolved.workflow_depth,
            action=action,
            last_event=event.last_event,
            correlation_id=resolved.correlation_id,
            request_id=resolved.request_id,
            last_sequence_no=resolved.last_sequence_no,
            event_at=resolved.event_at,
            identifiers=sync_result.identifiers,
            payload=dict(resolved.payload or {}),
            identifier_count=sync_result.identifier_count,
            first_seen_at=sync_result.first_seen_at,
            last_seen_at=sync_result.last_seen_at,
        )

        existing = cls._repository.get_by_workflow(resolved.workflow_instance_id)
        try:
            WorkflowTransitionValidator.validate(
                workflow_type=resolved.workflow_type,
                transition=transition,
                existing=existing,
            )
        except WorkflowTransitionError as exc:
            logger.warning(
                "support_trace_transition_rejected",
                extra={
                    "workflow_instance_id": resolved.workflow_instance_id,
                    "error": str(exc),
                    "action": action,
                },
                exc_info=True,
            )
            if raise_on_failure:
                raise
            return SupportTraceResult(
                success=False,
                correlation_id=resolved.correlation_id or resolved.workflow_instance_id,
                workflow_instance_id=resolved.workflow_instance_id,
                sync_status=SyncStatus.FAILED,
                error=str(exc),
                error_type="WorkflowTransitionError",
            )

        last_clinical: UUID | None = None
        last_business: UUID | None = None
        if event.source == TraceSource.CLINICAL_AUDIT:
            last_clinical = event.audit_uuid()
        else:
            last_business = event.audit_uuid()

        return WorkflowStateService.update_workflow_state(
            resolved=resolved,
            transition=transition,
            last_source=event.source,
            last_clinical_audit_id=last_clinical,
            last_business_audit_id=last_business,
            raise_on_failure=raise_on_failure,
        )

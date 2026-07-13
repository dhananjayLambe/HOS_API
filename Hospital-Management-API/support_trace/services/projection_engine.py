"""Projection engine — routes SupportTraceSyncEvent to projection consumers."""

from __future__ import annotations

from support_trace.domain.sync_event import SupportTraceSyncEvent
from support_trace.domain.types import SupportTraceResult
from support_trace.workflow.workflow_sync_service import WorkflowSyncService


class ProjectionEngine:
    """Orchestrates projection of audit SyncEvents onto read models.

    M5.2: workflow Support Trace only.
    M5.3+: search index / analytics.
    M5.8+: CloudWatch linkage.
    """

    @classmethod
    def project(
        cls,
        event: SupportTraceSyncEvent,
        *,
        raise_on_failure: bool = False,
    ) -> SupportTraceResult:
        event.validate()
        return WorkflowSyncService.sync(event, raise_on_failure=raise_on_failure)

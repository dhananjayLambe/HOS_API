"""SupportTrace → WorkflowSnapshot with computed health."""

from __future__ import annotations

from typing import Any

from support_trace.enums import TraceStatus
from support_trace.timeline.constants import ACTIVE_WORKFLOW_STATUSES, TERMINAL_WORKFLOW_STATUSES
from support_trace.timeline.enums import SnapshotWorkflowHealth
from support_trace.timeline.types import WorkflowSnapshot


class TimelineSnapshotBuilder:
    @classmethod
    def from_traces(cls, traces: list[Any]) -> list[WorkflowSnapshot]:
        return [cls._from_trace(t) for t in traces if t is not None]

    @classmethod
    def _from_trace(cls, trace: Any) -> WorkflowSnapshot:
        status = str(getattr(trace, "status", "") or "")
        retry_count = int(getattr(trace, "retry_count", 0) or 0)
        stored_health = str(getattr(trace, "workflow_health", "") or "")
        health = cls._derive_health(status, retry_count, stored_health)
        return WorkflowSnapshot(
            workflow_instance_id=str(getattr(trace, "workflow_instance_id", "")),
            workflow_type=str(getattr(trace, "workflow_type", "") or ""),
            current_state=str(getattr(trace, "current_state", "") or ""),
            workflow_step=getattr(trace, "workflow_step", None),
            status=status,
            workflow_health=health,
            duration_ms=getattr(trace, "duration_ms", None),
            retry_count=retry_count,
            correlation_id=getattr(trace, "correlation_id", None),
        )

    @staticmethod
    def _derive_health(status: str, retry_count: int, stored_health: str) -> str:
        if status == TraceStatus.COMPLETED:
            return SnapshotWorkflowHealth.COMPLETED
        if status in (TraceStatus.FAILED, TraceStatus.EXPIRED):
            return SnapshotWorkflowHealth.FAILED
        if retry_count > 0 or status == TraceStatus.RUNNING and stored_health == "Warning":
            return SnapshotWorkflowHealth.RETRYING
        if status in ACTIVE_WORKFLOW_STATUSES and stored_health in ("Warning", "Blocked"):
            return SnapshotWorkflowHealth.DELAYED
        if status in TERMINAL_WORKFLOW_STATUSES:
            return SnapshotWorkflowHealth.COMPLETED
        return SnapshotWorkflowHealth.HEALTHY

"""SupportTrace enrichment adapter — no history events."""

from __future__ import annotations

from typing import Any

from support_trace.timeline.enums import TimelineSource


class SupportTraceAdapter:
    """Does not emit TimelineEvents. Supplies trace context for snapshots/graph."""

    source_type = TimelineSource.SUPPORT_TRACE

    def collect_trace_metadata(self, trace: Any) -> dict[str, Any]:
        return {
            "workflow_instance_id": getattr(trace, "workflow_instance_id", None),
            "workflow_type": getattr(trace, "workflow_type", None),
            "parent_workflow_instance_id": getattr(trace, "parent_workflow_instance_id", None),
            "correlation_id": getattr(trace, "correlation_id", None),
            "status": getattr(trace, "status", None),
            "workflow_depth": getattr(trace, "workflow_depth", 0),
        }

    def collect_many(self, traces: list[Any]) -> list[dict[str, Any]]:
        return [self.collect_trace_metadata(t) for t in traces]

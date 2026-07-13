"""Retry analysis engine — pluggable."""

from __future__ import annotations

from typing import Any

from support_trace.incident.constants import RETRY_WORKFLOW_TYPES
from support_trace.incident.investigation_context import IncidentContext
from support_trace.incident.types import RetryAnalysis, RetryEvent
from support_trace.lookup.types import TraceLookupResult


class RetryAnalysisEngine:
    @classmethod
    def analyze(cls, ctx: IncidentContext, lookup: TraceLookupResult) -> RetryAnalysis:
        events: list[RetryEvent] = []
        by_workflow: dict[str, int] = {}
        seq = 0

        for trace in cls._all_traces(lookup):
            wf_type = str(getattr(trace, "workflow_type", "") or "")
            retry_count = int(getattr(trace, "retry_count", 0) or 0)
            if retry_count > 0:
                by_workflow[wf_type] = by_workflow.get(wf_type, 0) + retry_count
                status = str(getattr(trace, "status", "") or "").lower()
                succeeded = status in ("completed", "success", "delivered")
                for _ in range(retry_count):
                    seq += 1
                    events.append(
                        RetryEvent(
                            workflow_type=wf_type,
                            timestamp=getattr(trace, "last_event_at", None),
                            reason=getattr(trace, "last_event", None) or "retry",
                            succeeded=succeeded,
                            sequence=seq,
                        )
                    )

        if lookup.timeline:
            for event in lookup.timeline.events:
                tags = event.tags or ()
                if "retry" not in tags and "retry" not in str(event.action or "").lower():
                    continue
                wf_type = str(event.workflow_type or "Unknown")
                by_workflow[wf_type] = by_workflow.get(wf_type, 0) + 1
                seq += 1
                events.append(
                    RetryEvent(
                        workflow_type=wf_type,
                        timestamp=event.timestamp,
                        reason=str(event.summary or event.action or "retry"),
                        succeeded="success" in str(event.status or "").lower(),
                        sequence=seq,
                    )
                )

        total = sum(by_workflow.values())
        if lookup.statistics:
            total = max(total, lookup.statistics.retries)

        return RetryAnalysis(total_retries=total, events=tuple(events), by_workflow=by_workflow)

    @classmethod
    def _all_traces(cls, lookup: TraceLookupResult) -> list[Any]:
        traces: list[Any] = []
        if lookup.primary_trace:
            traces.append(lookup.primary_trace)
        if lookup.identifier_lookup:
            traces.extend(lookup.identifier_lookup.related_traces)
        return traces

    @classmethod
    def retry_workflow_types(cls) -> tuple[str, ...]:
        return RETRY_WORKFLOW_TYPES

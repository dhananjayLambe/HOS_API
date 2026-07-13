"""Workflow duration analysis engine — pluggable."""

from __future__ import annotations

from typing import Any

from support_trace.incident.investigation_context import IncidentContext
from support_trace.incident.types import DurationAnalysis, StageDuration
from support_trace.lookup.constants import DEFAULT_SLA_MS, SLA_MS_BY_WORKFLOW
from support_trace.lookup.types import TraceLookupResult
from support_trace.incident.relationship_engine import RelationshipEngine


class WorkflowDurationEngine:
    @classmethod
    def analyze(cls, ctx: IncidentContext, lookup: TraceLookupResult) -> DurationAnalysis:
        stages: list[StageDuration] = []
        traces = RelationshipEngine.ordered_chain_traces(RelationshipEngine.expand_journey(lookup))

        for trace in traces:
            wf_type = str(getattr(trace, "workflow_type", "") or "Unknown")
            duration_ms = getattr(trace, "duration_ms", None)
            if duration_ms is not None:
                duration_ms = int(duration_ms)
            sla_ms = SLA_MS_BY_WORKFLOW.get(wf_type, DEFAULT_SLA_MS)
            breached = duration_ms is not None and duration_ms > sla_ms
            stages.append(
                StageDuration(
                    stage=wf_type,
                    duration_ms=duration_ms,
                    sla_ms=sla_ms,
                    sla_breached=breached,
                )
            )

        total_ms = cls._total_duration(lookup, stages)
        return DurationAnalysis(
            stages=tuple(stages),
            total_duration_ms=total_ms,
            total_display=cls._format_duration(total_ms),
        )

    @classmethod
    def _total_duration(cls, lookup: TraceLookupResult, stages: list[StageDuration]) -> int | None:
        if lookup.timeline and lookup.timeline.statistics.timeline_duration_ms:
            return int(lookup.timeline.statistics.timeline_duration_ms)
        if lookup.statistics and lookup.statistics.duration_ms:
            return int(lookup.statistics.duration_ms)
        durations = [s.duration_ms for s in stages if s.duration_ms is not None]
        if durations:
            return sum(durations)
        return None

    @staticmethod
    def _format_duration(duration_ms: int | None) -> str:
        if not duration_ms:
            return "—"
        minutes = duration_ms // 60000
        if minutes < 1:
            return f"{duration_ms} ms"
        if minutes < 60:
            return f"{minutes} min"
        hours = minutes // 60
        return f"{hours}h {minutes % 60}m"

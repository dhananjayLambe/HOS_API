"""Direct SupportTrace fetch by workflow or correlation."""

from __future__ import annotations

from support_trace.domain.repository import SupportTraceRepository
from support_trace.identifiers.types import IdentifierLookupResult
from support_trace.timeline.timeline_resolver import TimelineResolver
from support_trace.timeline.types import TimelineScope


class WorkflowLookupDelegate:
    _repo = SupportTraceRepository()

    @classmethod
    def lookup_by_workflow(cls, workflow_instance_id: str) -> tuple[IdentifierLookupResult, TimelineScope]:
        trace = cls._repo.get_by_workflow(workflow_instance_id)
        traces = [trace] if trace else []
        lookup = IdentifierLookupResult(
            identifier=workflow_instance_id,
            normalized=workflow_instance_id,
            detected_type=None,
            matched_field="workflow_instance_id",
            matched_value=workflow_instance_id,
            confidence=1.0,
            strategy="exact",
            traces=traces,
            related_traces=[],
            trace_count=len(traces),
            related_trace_count=0,
        )
        scope = TimelineResolver.resolve_workflow(workflow_instance_id)
        return lookup, scope

    @classmethod
    def lookup_by_correlation(cls, correlation_id: str) -> tuple[IdentifierLookupResult, TimelineScope]:
        traces = cls._repo.get_by_correlation(correlation_id)
        lookup = IdentifierLookupResult(
            identifier=correlation_id,
            normalized=correlation_id,
            detected_type=None,
            matched_field="correlation_id",
            matched_value=correlation_id,
            confidence=1.0,
            strategy="exact",
            traces=list(traces),
            related_traces=[],
            trace_count=len(traces),
            related_trace_count=0,
        )
        scope = TimelineResolver.resolve_correlation(correlation_id)
        return lookup, scope

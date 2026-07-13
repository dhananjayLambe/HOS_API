"""Deterministic narrative builder — template-based, no AI."""

from __future__ import annotations

from support_trace.incident.constants import (
    NARRATIVE_DURATION,
    NARRATIVE_RETRY,
    NARRATIVE_STAGE_COMPLETED,
    NARRATIVE_STAGE_FAILED,
)
from support_trace.incident.relationship_engine import RelationshipEngine
from support_trace.incident.types import (
    DurationAnalysis,
    FailureAnalysis,
    IncidentSummary,
    RetryAnalysis,
)
from support_trace.lookup.types import TraceLookupResult


class NarrativeBuilder:
    @classmethod
    def build(
        cls,
        lookup: TraceLookupResult,
        *,
        summary: IncidentSummary | None = None,
        failure: FailureAnalysis | None = None,
        retry: RetryAnalysis | None = None,
        duration: DurationAnalysis | None = None,
    ) -> str:
        if lookup.summary and lookup.summary.narrative.text:
            base = lookup.summary.narrative.text
        else:
            base = cls._build_from_traces(lookup, failure, retry)

        if duration and duration.total_display != "—":
            base = f"{base} {NARRATIVE_DURATION.format(duration=duration.total_display)}"
        elif summary and summary.duration_display != "—":
            base = f"{base} {NARRATIVE_DURATION.format(duration=summary.duration_display)}"

        return base.strip()

    @classmethod
    def _build_from_traces(
        cls,
        lookup: TraceLookupResult,
        failure: FailureAnalysis | None,
        retry: RetryAnalysis | None,
    ) -> str:
        sentences: list[str] = []
        traces = RelationshipEngine.ordered_chain_traces(RelationshipEngine.expand_journey(lookup))

        for trace in traces:
            wf_type = str(getattr(trace, "workflow_type", "") or "Workflow")
            status = str(getattr(trace, "status", "") or "").lower()
            if status in ("failed", "expired"):
                reason = failure.failure_reason if failure and failure.failure_stage == wf_type else getattr(trace, "last_event", "unknown error")
                sentences.append(NARRATIVE_STAGE_FAILED.format(stage=wf_type, reason=reason))
            elif status in ("completed", "success", "delivered", "running"):
                if status != "running":
                    sentences.append(NARRATIVE_STAGE_COMPLETED.format(stage=wf_type))

        if retry and retry.total_retries > 0:
            for wf_type, count in retry.by_workflow.items():
                outcome = "succeeding" if any(e.succeeded for e in retry.events if e.workflow_type == wf_type) else "continuing"
                sentences.append(NARRATIVE_RETRY.format(stage=wf_type, count=count, outcome=outcome))

        if failure and failure.has_failure and not any("failed" in s.lower() for s in sentences):
            sentences.append(
                NARRATIVE_STAGE_FAILED.format(
                    stage=failure.failure_stage or "Workflow",
                    reason=failure.failure_reason or "unknown error",
                )
            )

        if not sentences:
            return "No incident activity recorded for this identifier."
        return " ".join(sentences)

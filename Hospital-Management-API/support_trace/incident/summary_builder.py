"""Structured incident summary builder."""

from __future__ import annotations

from support_trace.incident.types import (
    DurationAnalysis,
    FailureAnalysis,
    ImpactAnalysis,
    IncidentSummary,
    RetryAnalysis,
)
from support_trace.lookup.types import TraceLookupResult


class IncidentSummaryBuilder:
    @classmethod
    def build(
        cls,
        lookup: TraceLookupResult,
        *,
        failure: FailureAnalysis | None = None,
        retry: RetryAnalysis | None = None,
        duration: DurationAnalysis | None = None,
        impact: ImpactAnalysis | None = None,
    ) -> IncidentSummary:
        trace = lookup.primary_trace
        status = str(getattr(trace, "status", "") or "Unknown") if trace else "Not Found"
        completed = status.lower() in ("completed", "success", "delivered")
        has_failure = failure.has_failure if failure else False
        if not has_failure and trace:
            has_failure = status.lower() in ("failed", "expired")
        retry_count = retry.total_retries if retry else 0
        if lookup.summary:
            retry_count = max(retry_count, lookup.summary.structured.retry_count)
        duration_display = duration.total_display if duration else "—"
        if duration_display == "—" and lookup.summary:
            duration_display = lookup.summary.structured.duration_display
        affected = impact.affected_resource_count if impact else 0
        failure_stage = failure.failure_stage if failure and failure.has_failure else None

        return IncidentSummary(
            status=status,
            completed=completed and not has_failure,
            has_failure=has_failure,
            retry_count=retry_count,
            duration_display=duration_display,
            affected_resources=affected,
            failure_stage=failure_stage,
        )

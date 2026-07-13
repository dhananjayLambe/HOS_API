"""Investigation statistics for support dashboards."""

from __future__ import annotations

from typing import Any

from support_trace.lookup.types import InvestigationStatistics, InvestigationTimeline


class StatisticsBuilder:
    @classmethod
    def compute(
        cls,
        timeline: InvestigationTimeline | None,
        *,
        related_traces: list[Any] | None = None,
        clinical_count: int = 0,
        business_count: int = 0,
    ) -> InvestigationStatistics:
        if timeline is None:
            return InvestigationStatistics(
                clinical_events=clinical_count,
                business_events=business_count,
            )
        stats = timeline.statistics
        provider_calls = sum(
            1
            for e in timeline.events
            if "provider" in (e.tags or ()) or getattr(e, "action", "") and "provider" in str(e.action)
        )
        messages = sum(
            1
            for e in timeline.events
            if "whatsapp" in (e.tags or ()) or "communication" in str(e.category).lower()
        )
        payments = sum(
            1 for e in timeline.events if "payment" in (e.tags or ())
        )
        return InvestigationStatistics(
            clinical_events=stats.clinical_events or clinical_count,
            business_events=stats.business_events or business_count,
            timeline_events=stats.total_events,
            relationships=len(related_traces or []),
            failed_events=stats.failed_events,
            retries=stats.retry_count_total or stats.retry_events,
            duration_ms=stats.timeline_duration_ms,
            provider_calls=provider_calls,
            messages=messages,
            payments=payments,
            active_workflows=stats.active_workflows,
            completed_workflows=stats.completed_workflows,
        )

"""In-memory timeline filtering."""

from __future__ import annotations

from support_trace.timeline.types import TimelineEvent, TimelineFilter


class TimelineFilterEngine:
    @classmethod
    def apply(
        cls,
        events: list[TimelineEvent],
        filters: TimelineFilter | None,
    ) -> list[TimelineEvent]:
        if filters is None:
            return list(events)
        result = events
        if filters.date_from:
            result = [e for e in result if e.timestamp >= filters.date_from]
        if filters.date_to:
            result = [e for e in result if e.timestamp <= filters.date_to]
        if filters.categories:
            cats = set(filters.categories)
            result = [e for e in result if e.category in cats]
        if filters.severities:
            sevs = set(filters.severities)
            result = [e for e in result if e.severity in sevs]
        if filters.tags:
            tags = set(filters.tags)
            result = [e for e in result if tags.intersection(e.tags)]
        if filters.workflow_types:
            wfs = set(filters.workflow_types)
            result = [e for e in result if e.workflow_type in wfs]
        if filters.actors:
            actors = set(filters.actors)
            result = [e for e in result if e.actor in actors]
        if filters.statuses:
            statuses = set(filters.statuses)
            result = [e for e in result if e.status in statuses]
        if filters.sources:
            sources = set(filters.sources)
            result = [e for e in result if e.source in sources]
        if filters.action_prefix:
            prefix = filters.action_prefix
            result = [e for e in result if e.action and e.action.startswith(prefix)]
        return result

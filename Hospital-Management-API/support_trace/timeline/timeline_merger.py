"""Deterministic timeline event sorting."""

from __future__ import annotations

from dataclasses import replace

from support_trace.timeline.constants import CATEGORY_SORT_PRIORITY
from support_trace.timeline.types import TimelineEvent


class TimelineSorter:
    @classmethod
    def sort(cls, events: list[TimelineEvent]) -> list[TimelineEvent]:
        return sorted(events, key=cls._sort_key)

    @staticmethod
    def _sort_key(event: TimelineEvent) -> tuple:
        cat_prio = CATEGORY_SORT_PRIORITY.get(event.category, 99)
        seq = event.sequence_no if event.sequence_no is not None else 0
        return (
            event.timestamp,
            cat_prio,
            seq,
            event.reference_type,
            event.reference_id,
        )


class TimelineMerger:
    @classmethod
    def merge(cls, *event_lists: list[TimelineEvent]) -> list[TimelineEvent]:
        seen: set[tuple[str, str]] = set()
        merged: list[TimelineEvent] = []
        for events in event_lists:
            for event in events:
                key = (event.reference_type, event.reference_id)
                if key in seen:
                    continue
                seen.add(key)
                merged.append(event)
        sorted_events = TimelineSorter.sort(merged)
        return cls._assign_sequence(sorted_events)

    @classmethod
    def _assign_sequence(cls, events: list[TimelineEvent]) -> list[TimelineEvent]:
        result: list[TimelineEvent] = []
        for idx, event in enumerate(events, start=1):
            result.append(replace(event, timeline_sequence=idx))
        return result

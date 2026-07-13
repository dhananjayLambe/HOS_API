"""CloudWatch adapter stub for M5.8."""

from __future__ import annotations

from typing import Any

from support_trace.timeline.event_registry import EventRegistry
from support_trace.timeline.types import TimelineEvent


class CloudWatchAdapter:
    source_type = "CloudWatch"

    def adapt(
        self,
        row: Any,
        *,
        registry: type[EventRegistry] = EventRegistry,
    ) -> TimelineEvent | None:
        raise NotImplementedError("CloudWatch timeline adapter is planned for M5.8.")

    def adapt_many(
        self,
        rows: list[Any],
        *,
        registry: type[EventRegistry] = EventRegistry,
    ) -> list[TimelineEvent]:
        raise NotImplementedError("CloudWatch timeline adapter is planned for M5.8.")

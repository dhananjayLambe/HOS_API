"""Timeline source adapter protocol."""

from __future__ import annotations

from typing import Any, Protocol, runtime_checkable

from support_trace.timeline.event_registry import EventRegistry
from support_trace.timeline.types import TimelineEvent


@runtime_checkable
class TimelineSourceAdapter(Protocol):
    source_type: str

    def adapt(self, row: Any, *, registry: type[EventRegistry] = EventRegistry) -> TimelineEvent | None: ...

    def adapt_many(
        self,
        rows: list[Any],
        *,
        registry: type[EventRegistry] = EventRegistry,
    ) -> list[TimelineEvent]: ...

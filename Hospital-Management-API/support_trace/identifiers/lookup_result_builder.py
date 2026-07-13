"""Assembles rich IdentifierLookupResult objects."""

from __future__ import annotations

from support_trace.identifiers.types import (
    DetectedIdentifier,
    IdentifierLookupResult,
    SearchResult,
)
from support_trace.models import SupportTrace


class LookupResultBuilder:
    @classmethod
    def build(
        cls,
        *,
        raw: str,
        detected: DetectedIdentifier | None,
        search_result: SearchResult,
        related_traces: list[SupportTrace],
        search_time_ms: float,
    ) -> IdentifierLookupResult:
        traces = search_result.traces
        normalized = detected.normalized if detected else str(raw).strip()
        return IdentifierLookupResult(
            identifier=raw,
            normalized=normalized,
            detected_type=detected.identifier_type if detected else None,
            matched_field=search_result.matched_field,
            matched_value=search_result.matched_value,
            confidence=detected.confidence if detected else 0.0,
            strategy=search_result.strategy,
            traces=traces,
            related_traces=related_traces,
            trace_count=len(traces),
            related_trace_count=len(related_traces),
            search_time_ms=search_time_ms,
        )

"""Aggregates strategy detection."""

from __future__ import annotations

from support_trace.identifiers.identifier_registry import IdentifierRegistry
from support_trace.identifiers.types import DetectedIdentifier


class DetectorRegistry:
    @classmethod
    def detect_all(cls, raw: str) -> list[DetectedIdentifier]:
        text = str(raw).strip()
        if not text:
            return []
        results: list[DetectedIdentifier] = []
        for strategy in IdentifierRegistry.all_strategies():
            detected = strategy.detect(text)
            if detected is not None:
                results.append(detected)
        results.sort(key=lambda item: item.confidence, reverse=True)
        return results

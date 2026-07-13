"""Automatic identifier type detection."""

from __future__ import annotations

from support_trace.identifiers.detector_registry import DetectorRegistry
from support_trace.identifiers.types import DetectedIdentifier


class IdentifierDetector:
    @classmethod
    def detect(cls, raw: str) -> list[DetectedIdentifier]:
        return DetectorRegistry.detect_all(raw)

    @classmethod
    def detect_best(cls, raw: str) -> DetectedIdentifier | None:
        candidates = cls.detect(raw)
        return candidates[0] if candidates else None

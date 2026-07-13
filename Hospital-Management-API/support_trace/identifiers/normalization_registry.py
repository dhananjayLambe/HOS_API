"""Aggregates strategy normalization."""

from __future__ import annotations

from typing import Any

from support_trace.identifiers.identifier_registry import IdentifierRegistry


class NormalizationRegistry:
    @classmethod
    def normalize(cls, field: str, value: Any) -> str | None:
        if value is None:
            return None
        strategy = IdentifierRegistry.get_by_field(field)
        if strategy is not None:
            return strategy.normalize(str(value))
        text = str(value).strip()
        return text or None

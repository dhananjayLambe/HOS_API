"""Base DTO for doctor report workspace API contracts."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


def _json_safe(value: Any) -> Any:
    """Convert dataclass asdict output to JSON-friendly primitives (tuples → lists)."""
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, tuple):
        return [_json_safe(v) for v in value]
    if isinstance(value, list):
        return [_json_safe(v) for v in value]
    return value


@dataclass(frozen=True)
class BaseDTO:
    """Immutable API contract base. All workspace DTOs subclass this."""

    def to_dict(self) -> dict[str, Any]:
        return _json_safe(asdict(self))

"""Shared validation helpers for workspace list/search query params."""

from __future__ import annotations

from uuid import UUID


def is_uuid_string(value: str | None) -> bool:
    if not value:
        return False
    try:
        UUID(str(value))
        return True
    except (ValueError, TypeError, AttributeError):
        return False


def require_uuid_or_none(value: str | None, *, field: str) -> str | None:
    if value is None or value == "":
        return None
    if not is_uuid_string(value):
        raise ValueError(f"Invalid {field}: must be a UUID.")
    return str(value)

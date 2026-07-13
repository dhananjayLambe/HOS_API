"""API input validators."""

from __future__ import annotations

from shared.audit.base_validator import is_valid_uuid


def resolve_exact_only(query: str | None, explicit: str | bool | None) -> bool:
    if explicit is not None:
        return str(explicit).lower() in ("1", "true", "yes", "on")
    if query and is_valid_uuid(str(query).strip()):
        return True
    return False


def allows_partial_search(query: str | None) -> bool:
    if not query:
        return False
    text = str(query).strip()
    if is_valid_uuid(text):
        return False
    if text.startswith("wamid.") or text.startswith("pay_"):
        return True
    digits = "".join(c for c in text if c.isdigit())
    if len(digits) >= 8:
        return True
    return len(text) >= 4

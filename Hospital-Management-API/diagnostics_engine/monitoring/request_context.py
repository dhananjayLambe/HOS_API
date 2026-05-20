"""Request-scoped correlation IDs for report operational workflows."""

from __future__ import annotations

import uuid
from contextvars import ContextVar

_request_id_var: ContextVar[str | None] = ContextVar("diagnostics_report_request_id", default=None)


def set_request_id(value: str | None) -> None:
    _request_id_var.set(value)


def get_request_id() -> str | None:
    return _request_id_var.get()


def resolve_request_id(header_value: str | None = None) -> str:
    """Use explicit header/value or generate a new correlation id."""
    if header_value and str(header_value).strip():
        rid = str(header_value).strip()[:128]
    else:
        rid = str(uuid.uuid4())
    set_request_id(rid)
    return rid

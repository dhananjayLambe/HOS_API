"""Opaque keyset cursor helpers for workspace list pagination."""

from __future__ import annotations

import base64
import json
from datetime import date, datetime
from typing import Any


def encode_cursor(*, ordering_value: Any, pk: Any) -> str:
    if isinstance(ordering_value, (datetime, date)):
        ordering_value = ordering_value.isoformat()
    payload = {"o": ordering_value, "id": str(pk)}
    raw = json.dumps(payload, separators=(",", ":"), default=str).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii")


def decode_cursor(cursor: str | None) -> tuple[Any, str] | None:
    if not cursor:
        return None
    try:
        raw = base64.urlsafe_b64decode(cursor.encode("ascii"))
        payload = json.loads(raw.decode("utf-8"))
        return payload.get("o"), str(payload["id"])
    except (ValueError, KeyError, TypeError, json.JSONDecodeError):
        return None

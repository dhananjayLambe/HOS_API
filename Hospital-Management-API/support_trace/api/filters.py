"""Advanced POST search filter helpers."""

from __future__ import annotations

from typing import Any


def extract_search_query(body: dict[str, Any]) -> str | None:
    if body.get("q"):
        return str(body["q"]).strip()
    if body.get("query"):
        return str(body["query"]).strip()
    identifiers = body.get("identifiers")
    if isinstance(identifiers, list) and identifiers:
        return str(identifiers[0]).strip()
    patient = body.get("patient_account_id") or body.get("patient_id")
    if patient:
        return str(patient).strip()
    return None

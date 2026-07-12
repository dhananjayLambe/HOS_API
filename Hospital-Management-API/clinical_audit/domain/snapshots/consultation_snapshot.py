"""Consultation snapshot builder for audit previous_value fields."""

from __future__ import annotations

from typing import Any


def build_consultation_snapshot(*, encounter, consultation) -> dict[str, Any]:
    """Minimal JSON-safe consultation state. No PHI beyond status identifiers."""
    return {
        "encounter_status": getattr(encounter, "status", None),
        "consultation_finalized": bool(getattr(consultation, "is_finalized", False)),
        "started_at": _iso(getattr(consultation, "started_at", None)),
        "ended_at": _iso(getattr(consultation, "ended_at", None)),
        "visit_pnr": getattr(encounter, "visit_pnr", None),
    }


def _iso(value) -> str | None:
    if value is None:
        return None
    return value.isoformat()

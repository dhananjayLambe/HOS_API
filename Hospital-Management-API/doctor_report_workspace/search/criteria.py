"""Immutable search request criteria for WorkspaceReportRepository.search_reports."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any


@dataclass(frozen=True)
class WorkspaceSearchCriteria:
    """Normalized search request. Scope stays on WorkspaceScope."""

    q: str
    ordering: str = "-uploaded_at"
    cursor: str | None = None
    page_size: int | None = None
    patient_id: str | None = None
    consultation_id: str | None = None
    encounter_id: str | None = None
    doctor_id: str | None = None
    lab_id: str | None = None
    category: str | None = None
    status: str | None = None
    date_from: date | None = None
    date_to: date | None = None

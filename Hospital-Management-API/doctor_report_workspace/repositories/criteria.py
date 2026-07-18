"""Shared criteria / scope value objects for workspace repository queries."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any


@dataclass(frozen=True)
class WorkspaceScope:
    doctor_id: Any
    clinic_id: Any


@dataclass(frozen=True)
class WorkspaceListCriteria:
    """Filter/search/order inputs. IDs for filters; names only via ``q``."""

    q: str | None = None
    patient_id: str | None = None
    consultation_id: str | None = None
    encounter_id: str | None = None
    doctor_id: str | None = None  # filter param ``doctor``
    lab_id: str | None = None  # filter param ``lab`` or ``branch``
    category: str | None = None
    status: str | None = None  # clinical status
    date_from: date | None = None
    date_to: date | None = None
    quick_filter: str | None = None
    ordering: str = "-uploaded_at"
    # Queue-driven clinical narrowing for reports source (service sets these)
    clinical_ready_only: bool = False  # AVAILABLE | UPDATED
    clinical_awaiting_only: bool = False  # AWAITING_REPORT on report rows


@dataclass(frozen=True)
class PageResult:
    """Evaluated page of domain rows + opaque next cursor."""

    rows: tuple[Any, ...]
    next_cursor: str | None
    page_size: int

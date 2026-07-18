"""ReportDetailAggregate — internal clinical read model for workspace detail.

Repository output only. Immutable. Never returned by the API or persisted.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class ReportDetailAggregate:
    """Fully hydrated detail graph; mapper consumes these slots only (no ORM traversal)."""

    report: Any
    patient: Any | None
    encounter: Any | None
    consultation: Any | None
    branch: Any | None
    doctor: Any | None
    service: Any | None
    artifacts: tuple[Any, ...]  # raw active artifacts; load order -uploaded_at
    has_artifact: bool
    ordered_at: Any | None
    collected_at: Any | None
    uploaded_at: Any | None

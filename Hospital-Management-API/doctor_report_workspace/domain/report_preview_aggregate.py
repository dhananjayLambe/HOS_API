"""ReportPreviewAggregate — repository read model for secure preview access."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class ReportPreviewAggregate:
    """Active report head + active artifacts within doctor/clinic scope."""

    report: Any
    artifacts: tuple[Any, ...]  # active only; load order -uploaded_at

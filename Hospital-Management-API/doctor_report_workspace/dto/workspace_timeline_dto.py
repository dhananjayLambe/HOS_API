"""Phase 1 clinical timeline (ordered / collected / uploaded)."""

from __future__ import annotations

from dataclasses import dataclass

from doctor_report_workspace.dto.base import BaseDTO


@dataclass(frozen=True)
class WorkspaceTimelineDTO(BaseDTO):
    ordered_at: str | None
    collected_at: str | None
    uploaded_at: str | None

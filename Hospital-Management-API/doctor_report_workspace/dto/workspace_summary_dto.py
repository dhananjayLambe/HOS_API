"""KPI queue counts body (= API.md WorkspaceQueueCountsDTO)."""

from __future__ import annotations

from dataclasses import dataclass

from doctor_report_workspace.dto.base import BaseDTO


@dataclass(frozen=True)
class WorkspaceSummaryDTO(BaseDTO):
    reports_ready: int
    awaiting: int
    critical: int

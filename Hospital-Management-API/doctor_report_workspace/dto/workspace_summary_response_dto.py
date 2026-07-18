"""Explicit GET /summary/ response wrapper."""

from __future__ import annotations

from dataclasses import dataclass

from doctor_report_workspace.dto.base import BaseDTO
from doctor_report_workspace.dto.workspace_summary_dto import WorkspaceSummaryDTO


@dataclass(frozen=True)
class WorkspaceSummaryResponseDTO(BaseDTO):
    summary: WorkspaceSummaryDTO

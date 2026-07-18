"""Explicit list endpoint response — reports + pagination only."""

from __future__ import annotations

from dataclasses import dataclass

from doctor_report_workspace.dto.base import BaseDTO
from doctor_report_workspace.dto.workspace_report_dto import WorkspaceReportDTO


@dataclass(frozen=True)
class WorkspacePaginationDTO(BaseDTO):
    page: int
    page_size: int
    next_cursor: str | None


@dataclass(frozen=True)
class WorkspaceListResponseDTO(BaseDTO):
    reports: tuple[WorkspaceReportDTO, ...]
    pagination: WorkspacePaginationDTO

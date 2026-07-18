"""Explicit filters metadata response wrapper."""

from __future__ import annotations

from dataclasses import dataclass

from doctor_report_workspace.dto.base import BaseDTO
from doctor_report_workspace.dto.workspace_filters_dto import WorkspaceFiltersDTO


@dataclass(frozen=True)
class WorkspaceFiltersResponseDTO(BaseDTO):
    filters: WorkspaceFiltersDTO

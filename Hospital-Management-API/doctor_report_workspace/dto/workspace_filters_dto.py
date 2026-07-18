"""Phase 1 filter option metadata (no priorities / modalities / report types)."""

from __future__ import annotations

from dataclasses import dataclass

from doctor_report_workspace.dto.base import BaseDTO


@dataclass(frozen=True)
class WorkspaceFiltersDTO(BaseDTO):
    statuses: tuple[str, ...]
    labs: tuple[str, ...]
    categories: tuple[str, ...]
    doctors: tuple[str, ...]
    branches: tuple[str, ...]

"""PreviewResponseDTO — lightweight preview access contract (not detail DTO)."""

from __future__ import annotations

from dataclasses import dataclass

from doctor_report_workspace.dto.base import BaseDTO


@dataclass(frozen=True)
class PreviewResponseDTO(BaseDTO):
    preview_supported: bool
    preview_url: str | None
    artifact_type: str | None
    expires_at: str | None

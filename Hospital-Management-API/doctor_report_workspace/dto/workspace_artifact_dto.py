"""Artifact file metadata for doctor workspace preview/download."""

from __future__ import annotations

from dataclasses import dataclass

from doctor_report_workspace.dto.base import BaseDTO


@dataclass(frozen=True)
class WorkspaceArtifactDTO(BaseDTO):
    id: str
    label: str
    artifact_type: str  # PDF | IMAGE | CSV | XLSX | DOCX | TXT | ZIP | DICOM | OTHER
    preview_url: str | None
    download_url: str
    is_primary: bool

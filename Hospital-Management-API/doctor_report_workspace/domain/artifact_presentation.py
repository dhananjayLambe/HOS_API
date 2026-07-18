"""Artifact presentation models — internal read models only (never API responses)."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ArtifactPreviewMetadata:
    """Storage-agnostic preview hints for future viewers / AccessService."""

    mime_type: str | None
    extension: str | None
    display_title: str
    preview_supported: bool
    content_category: str  # DOCUMENT | IMAGE | TEXT | OFFICE | OTHER


@dataclass(frozen=True)
class ArtifactPresentation:
    """Immutable presentation of one artifact. Tuple position is display order."""

    artifact_id: str
    artifact_type: str  # PDF | IMAGE | CSV | XLSX | DOCX | TXT | ZIP | DICOM | OTHER
    label: str
    is_primary: bool
    preview_metadata: ArtifactPreviewMetadata

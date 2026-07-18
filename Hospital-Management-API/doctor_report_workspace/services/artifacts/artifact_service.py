"""ArtifactService — in-memory presentation orchestration (no DB / storage)."""

from __future__ import annotations

import time
from typing import Any, Sequence

from shared.logging import LogModule, logger

from doctor_report_workspace.domain.artifact_presentation import (
    ArtifactPresentation,
    ArtifactPreviewMetadata,
)
from doctor_report_workspace.services.artifacts.label_resolver import ArtifactLabelResolver
from doctor_report_workspace.services.artifacts.primary_selector import PrimaryArtifactSelector

# Known diagnostic artifact types returned on the workspace DTO (not collapsed).
KNOWN_ARTIFACT_TYPES = frozenset(
    {"PDF", "IMAGE", "CSV", "XLSX", "DOCX", "TXT", "ZIP", "DICOM"}
)

# Browser can render these inline via preview URL (stream / iframe / img / text).
INLINE_PREVIEW_TYPES = frozenset({"PDF", "IMAGE", "CSV", "TXT"})


def _bucket_type(raw: Any) -> str:
    text = (str(raw) if raw is not None else "").upper()
    if text in KNOWN_ARTIFACT_TYPES:
        return text
    return "OTHER"


def _content_category(bucket: str) -> str:
    if bucket == "PDF":
        return "DOCUMENT"
    if bucket == "IMAGE":
        return "IMAGE"
    if bucket in ("CSV", "TXT"):
        return "TEXT"
    if bucket in ("XLSX", "DOCX"):
        return "OFFICE"
    return "OTHER"


def _extension(artifact: Any) -> str | None:
    ext = getattr(artifact, "file_extension", None)
    if ext:
        return str(ext).lstrip(".").lower() or None
    for name_attr in ("download_filename", "original_filename"):
        name = getattr(artifact, name_attr, None)
        if name and "." in str(name):
            return str(name).rsplit(".", 1)[-1].lower() or None
    return None


def _display_title(artifact: Any, *, label: str) -> str:
    for attr in ("download_filename", "original_filename"):
        value = getattr(artifact, attr, None)
        if value:
            return str(value)
    return label


def _sort_key_remaining(artifact: Any) -> tuple:
    ts = getattr(artifact, "uploaded_at", None)
    return (ts is not None, ts or 0, str(getattr(artifact, "id", "")))


class ArtifactService:
    """Orchestrate primary selection → order → labels → preview metadata.

    Operates on duck-typed artifact objects only. Never QuerySets, managers, or storage.
    """

    @classmethod
    def present(
        cls,
        artifacts: Sequence[Any],
        *,
        report_uuid: str | None = None,
    ) -> tuple[ArtifactPresentation, ...]:
        started = time.perf_counter()
        items = list(artifacts or ())
        if not items:
            cls._log(
                started,
                report_uuid=report_uuid,
                artifact_count=0,
                primary_selected=False,
            )
            return ()

        primary = PrimaryArtifactSelector.select(items)
        primary_id = str(getattr(primary, "id", "")) if primary is not None else None

        remaining = [
            a for a in items if str(getattr(a, "id", "")) != primary_id
        ]
        # Stable order: primary first, then uploaded_at ASC, then UUID.
        remaining.sort(key=_sort_key_remaining)

        ordered = ([primary] if primary is not None else []) + remaining
        presentations: list[ArtifactPresentation] = []
        for artifact in ordered:
            aid = str(getattr(artifact, "id", ""))
            is_primary = primary_id is not None and aid == primary_id
            bucket = _bucket_type(getattr(artifact, "artifact_type", None))
            label = ArtifactLabelResolver.resolve(
                artifact_type=bucket, is_primary=is_primary
            )
            preview_supported = bucket in INLINE_PREVIEW_TYPES
            meta = ArtifactPreviewMetadata(
                mime_type=(
                    str(getattr(artifact, "content_type", None))
                    if getattr(artifact, "content_type", None)
                    else None
                ),
                extension=_extension(artifact),
                display_title=_display_title(artifact, label=label),
                preview_supported=preview_supported,
                content_category=_content_category(bucket),
            )
            presentations.append(
                ArtifactPresentation(
                    artifact_id=aid,
                    artifact_type=bucket,
                    label=label,
                    is_primary=is_primary,
                    preview_metadata=meta,
                )
            )

        cls._log(
            started,
            report_uuid=report_uuid,
            artifact_count=len(presentations),
            primary_selected=any(p.is_primary for p in presentations),
        )
        return tuple(presentations)

    @classmethod
    def resolve_preview(
        cls,
        artifacts: Sequence[Any],
        *,
        report_uuid: str | None = None,
    ) -> ArtifactPresentation | None:
        """Pick previewable presentation: primary previewable, else first in order.

        Presentation order from ``present`` is primary-first, then uploaded_at ASC.
        Returns None when no inline-previewable artifact exists.
        """
        presentations = cls.present(artifacts, report_uuid=report_uuid)
        previewable = [
            p for p in presentations if p.preview_metadata.preview_supported
        ]
        if not previewable:
            return None
        primary = next((p for p in previewable if p.is_primary), None)
        return primary if primary is not None else previewable[0]

    @staticmethod
    def _log(
        started: float,
        *,
        report_uuid: str | None,
        artifact_count: int,
        primary_selected: bool,
    ) -> None:
        metadata: dict[str, Any] = {
            "artifact_count": artifact_count,
            "primary_selected": primary_selected,
            "duration_ms": int((time.perf_counter() - started) * 1000),
        }
        if report_uuid:
            metadata["report_uuid"] = str(report_uuid)
        logger.info(
            "Artifact presentation completed",
            module=LogModule.REPORTS,
            action="doctor_report_workspace.artifact_service",
            metadata=metadata,
        )

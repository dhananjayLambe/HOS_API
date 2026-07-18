"""Shared artifact resolution for workspace preview and download.

Repository-scoped load only: never look up artifact UUID without report ownership.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Sequence
from uuid import UUID

from doctor_report_workspace.services.artifacts.artifact_service import ArtifactService
from doctor_report_workspace.services.workspace.workspace_report_detail_service import (
    WorkspaceReportNotFound,
)


class ArtifactAccessValidationError(ValueError):
    """Invalid artifact_id query parameter."""


@dataclass(frozen=True)
class ResolvedArtifactAccess:
    """Report-owned active artifact ready for preview or download."""

    report: Any
    artifact: Any
    artifact_id: str
    artifact_type: str | None = None
    preview_supported: bool = True


class ArtifactAccessResolver:
    """Resolve primary or owned artifact from a report-scoped active list.

    Callers must already have loaded the report under doctor/clinic scope
    (``aggregate is None`` → not found / out of scope → 404 at the service layer).
    """

    @classmethod
    def resolve(
        cls,
        *,
        report: Any,
        artifacts: Sequence[Any],
        artifact_id: str | None,
        report_uuid: str,
        require_previewable: bool = False,
    ) -> ResolvedArtifactAccess | None:
        """Return the active artifact for access, or None if default preview unsupported.

        * No ``artifact_id`` → primary (download) or primary-previewable (preview).
        * With ``artifact_id`` → must belong to this report's active set.
        * ``require_previewable`` + no ``artifact_id`` + nothing previewable → ``None``.
        * ``require_previewable`` + explicit non-previewable ``artifact_id`` → 404.
        """
        items = list(artifacts or ())
        if not items:
            raise WorkspaceReportNotFound("Report not found.")

        if artifact_id is None or artifact_id == "":
            return cls._resolve_default(
                report=report,
                artifacts=items,
                report_uuid=report_uuid,
                require_previewable=require_previewable,
            )

        target_id = cls._require_artifact_uuid(artifact_id)
        artifact = next(
            (a for a in items if str(getattr(a, "id", "")) == target_id),
            None,
        )
        if artifact is None:
            # Wrong report / inactive / unknown — privacy-equivalent 404.
            raise WorkspaceReportNotFound("Report not found.")

        presentations = ArtifactService.present(items, report_uuid=report_uuid)
        presentation = next(
            (p for p in presentations if p.artifact_id == target_id),
            None,
        )
        preview_supported = bool(
            presentation and presentation.preview_metadata.preview_supported
        )
        if require_previewable and not preview_supported:
            raise WorkspaceReportNotFound("Report not found.")

        artifact_type = (
            presentation.artifact_type
            if presentation is not None
            else str(getattr(artifact, "artifact_type", "") or "") or None
        )
        return ResolvedArtifactAccess(
            report=report,
            artifact=artifact,
            artifact_id=target_id,
            artifact_type=artifact_type,
            preview_supported=preview_supported,
        )

    @classmethod
    def _resolve_default(
        cls,
        *,
        report: Any,
        artifacts: list[Any],
        report_uuid: str,
        require_previewable: bool,
    ) -> ResolvedArtifactAccess | None:
        if require_previewable:
            presentation = ArtifactService.resolve_preview(
                artifacts,
                report_uuid=report_uuid,
            )
            if presentation is None:
                return None
            artifact = next(
                (
                    a
                    for a in artifacts
                    if str(getattr(a, "id", "")) == presentation.artifact_id
                ),
                None,
            )
            if artifact is None:
                raise WorkspaceReportNotFound("Report not found.")
            return ResolvedArtifactAccess(
                report=report,
                artifact=artifact,
                artifact_id=str(presentation.artifact_id),
                artifact_type=presentation.artifact_type,
                preview_supported=True,
            )

        presentations = ArtifactService.present(artifacts, report_uuid=report_uuid)
        if not presentations:
            raise WorkspaceReportNotFound("Report not found.")
        primary = next((p for p in presentations if p.is_primary), presentations[0])
        artifact = next(
            (
                a
                for a in artifacts
                if str(getattr(a, "id", "")) == primary.artifact_id
            ),
            None,
        )
        if artifact is None:
            raise WorkspaceReportNotFound("Report not found.")
        return ResolvedArtifactAccess(
            report=report,
            artifact=artifact,
            artifact_id=str(primary.artifact_id),
            artifact_type=primary.artifact_type,
            preview_supported=primary.preview_metadata.preview_supported,
        )

    @staticmethod
    def _require_artifact_uuid(value: Any) -> str:
        try:
            return str(UUID(str(value)))
        except (ValueError, TypeError, AttributeError) as exc:
            raise ArtifactAccessValidationError(
                "Invalid artifact_id: must be a UUID."
            ) from exc

"""PreviewPresenter — preview payload via presentation → mapper (structural)."""

from __future__ import annotations

from typing import Any

from doctor_report_workspace.mappers.workspace_response_mapper import WorkspaceResponseMapper
from doctor_report_workspace.services.artifacts.artifact_service import ArtifactService


class PreviewPresenter:
    """Thin adapter: ArtifactService → mapper → to_dict(). No response dicts by hand."""

    def present(self, *, report_id: Any, artifact: Any, preview_url: str | None) -> dict:
        presentations = ArtifactService.present([artifact])
        if not presentations:
            return {
                "report_id": str(report_id),
                "artifact": None,
                "preview_url": preview_url,
            }
        artifact_dto = WorkspaceResponseMapper.to_artifact_from_presentation(
            presentations[0],
            preview_url=preview_url,
            download_url=preview_url or "",
        )
        return {
            "report_id": str(report_id),
            "artifact": artifact_dto.to_dict(),
            "preview_url": preview_url,
        }

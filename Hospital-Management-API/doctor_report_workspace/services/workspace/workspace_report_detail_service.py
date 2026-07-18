"""WorkspaceReportDetailService — single-report clinical read orchestration."""

from __future__ import annotations

import time
from typing import Any
from uuid import UUID

from shared.logging import LogModule, logger

from doctor_report_workspace.dto import WorkspaceReportDetailDTO
from doctor_report_workspace.mappers.workspace_response_mapper import WorkspaceResponseMapper
from doctor_report_workspace.repositories.criteria import WorkspaceScope
from doctor_report_workspace.repositories.workspace_report_repository import (
    WorkspaceReportRepository,
)
from doctor_report_workspace.services.artifacts.artifact_service import ArtifactService
from doctor_report_workspace.services.workspace.clinical_status_mapper import ClinicalStatusMapper

from django.urls import reverse


class WorkspaceReportDetailValidationError(ValueError):
    """Invalid detail request parameters."""


class WorkspaceReportNotFound(Exception):
    """Report missing, inactive, or outside doctor/clinic scope."""


class WorkspaceReportDetailService:
    """Validate → repository aggregate → status → mapper → DTO."""

    def __init__(self, repository: WorkspaceReportRepository | None = None):
        self._repository = repository or WorkspaceReportRepository()

    def get_detail(
        self,
        *,
        doctor_id: Any,
        clinic_id: Any,
        report_id: Any,
    ) -> WorkspaceReportDetailDTO:
        started = time.perf_counter()
        report_uuid = self._require_uuid(report_id)
        scope = WorkspaceScope(doctor_id=doctor_id, clinic_id=clinic_id)
        aggregate = self._repository.get_report_detail(scope, report_uuid)
        if aggregate is None:
            raise WorkspaceReportNotFound("Report not found.")

        clinical_status = ClinicalStatusMapper.map_report(
            report=aggregate.report,
            has_artifact=aggregate.has_artifact,
        )
        presentations = ArtifactService.present(
            aggregate.artifacts,
            report_uuid=str(report_uuid),
        )
        download_url_by_artifact_id = self._download_api_urls(
            presentations,
            report_uuid=report_uuid,
            clinic_id=clinic_id,
        )
        preview_url_by_artifact_id = self._preview_api_urls(
            presentations,
            report_uuid=report_uuid,
            clinic_id=clinic_id,
        )
        dto = WorkspaceResponseMapper.to_report_detail_from_aggregate(
            aggregate,
            clinical_status=clinical_status,
            artifact_presentations=presentations,
            preview_url_by_artifact_id=preview_url_by_artifact_id,
            download_url_by_artifact_id=download_url_by_artifact_id,
        )
        duration_ms = int((time.perf_counter() - started) * 1000)
        logger.info(
            "Workspace report detail completed",
            module=LogModule.REPORTS,
            action="doctor_report_workspace.detail",
            metadata={
                "report_uuid": str(report_uuid),
                "clinic_uuid": str(clinic_id),
                "duration_ms": duration_ms,
                "artifact_count": len(presentations),
            },
        )
        return dto

    @staticmethod
    def _download_api_urls(
        presentations,
        *,
        report_uuid: str,
        clinic_id: Any,
    ) -> dict[str, str]:
        """Opaque workspace download API path per active artifact (not presigned)."""
        if not presentations:
            return {}
        path = reverse(
            "doctor_report_workspace:workspace-report-download",
            kwargs={"report_id": report_uuid},
        )
        return {
            p.artifact_id: (
                f"{path}?clinic_id={clinic_id}&artifact_id={p.artifact_id}"
            )
            for p in presentations
        }

    @staticmethod
    def _preview_api_urls(
        presentations,
        *,
        report_uuid: str,
        clinic_id: Any,
    ) -> dict[str, str]:
        """Opaque workspace preview API path per inline-previewable artifact."""
        previewable = [
            p for p in presentations if p.preview_metadata.preview_supported
        ]
        if not previewable:
            return {}
        path = reverse(
            "doctor_report_workspace:workspace-report-preview",
            kwargs={"report_id": report_uuid},
        )
        return {
            p.artifact_id: (
                f"{path}?clinic_id={clinic_id}&artifact_id={p.artifact_id}"
            )
            for p in previewable
        }

    @staticmethod
    def _require_uuid(value: Any) -> str:
        if value is None or value == "":
            raise WorkspaceReportDetailValidationError("report_id is required.")
        try:
            return str(UUID(str(value)))
        except (ValueError, TypeError, AttributeError) as exc:
            raise WorkspaceReportDetailValidationError(
                "Invalid report_id: must be a UUID."
            ) from exc

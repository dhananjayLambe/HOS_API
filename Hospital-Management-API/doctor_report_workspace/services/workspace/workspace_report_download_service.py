"""WorkspaceReportDownloadService — authorize → resolve artifact → audit → access URL."""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any
from uuid import UUID

from shared.logging import LogModule, logger

from diagnostics_engine.audit import schedule_report_downloaded
from diagnostics_engine.storage.report_storage import ReportStorageService
from diagnostics_engine.storage.s3_report_storage import reports_local_stream_enabled

from doctor_report_workspace.repositories.criteria import WorkspaceScope
from doctor_report_workspace.repositories.workspace_report_repository import (
    WorkspaceReportRepository,
)
from doctor_report_workspace.services.artifacts.artifact_access_resolver import (
    ArtifactAccessResolver,
    ArtifactAccessValidationError,
)
from doctor_report_workspace.services.artifacts.artifact_access_service import (
    ArtifactAccessError,
    ArtifactAccessService,
)
from doctor_report_workspace.services.workspace.workspace_report_detail_service import (
    WorkspaceReportNotFound,
)


class WorkspaceReportDownloadValidationError(ValueError):
    """Invalid download request parameters."""


@dataclass(frozen=True)
class DownloadResult:
    url: str | None = None
    artifact_id: str = ""
    expires_in: int = 0
    """When set, view streams local file bytes (no S3) instead of 302."""
    stream_artifact: Any = None


def _local_file_streamable(artifact: Any) -> bool:
    if not reports_local_stream_enabled():
        return False
    if not getattr(artifact, "file", None):
        return False
    try:
        return bool(ReportStorageService.exists(artifact))
    except Exception:
        return False


class WorkspaceReportDownloadService:
    """Orchestrate download access without ORM or storage details in the view."""

    def __init__(self, repository: WorkspaceReportRepository | None = None):
        self._repository = repository or WorkspaceReportRepository()

    def get_download(
        self,
        *,
        doctor_id: Any,
        clinic_id: Any,
        report_id: Any,
        user: Any,
        artifact_id: str | None = None,
    ) -> DownloadResult:
        started = time.perf_counter()
        report_uuid = self._require_uuid(report_id)
        scope = WorkspaceScope(doctor_id=doctor_id, clinic_id=clinic_id)
        aggregate = self._repository.get_download_artifact(scope, report_uuid)
        if aggregate is None:
            raise WorkspaceReportNotFound("Report not found.")

        try:
            resolved = ArtifactAccessResolver.resolve(
                report=aggregate.report,
                artifacts=aggregate.artifacts,
                artifact_id=artifact_id,
                report_uuid=str(report_uuid),
                require_previewable=False,
            )
        except ArtifactAccessValidationError as exc:
            raise WorkspaceReportDownloadValidationError(str(exc)) from exc

        if resolved is None:
            raise WorkspaceReportNotFound("Report not found.")

        artifact = resolved.artifact
        # Audit before URL issuance (fail-open inside hook).
        schedule_report_downloaded(
            report=aggregate.report,
            user=user,
            download_channel="Web",
            artifact_id=resolved.artifact_id,
            download_format=resolved.artifact_type or "PDF",
        )

        url: str | None = None
        stream_artifact: Any = None
        try:
            url = ArtifactAccessService.generate_download_url(artifact)
        except ArtifactAccessError as exc:
            if not _local_file_streamable(artifact):
                raise WorkspaceReportNotFound("Report not found.") from exc
            stream_artifact = artifact

        expires_in = ArtifactAccessService.default_expires_in()
        duration_ms = int((time.perf_counter() - started) * 1000)
        logger.info(
            "Workspace report download completed",
            module=LogModule.REPORTS,
            action="doctor_report_workspace.download",
            metadata={
                "report_uuid": str(report_uuid),
                "artifact_uuid": str(resolved.artifact_id),
                "clinic_uuid": str(clinic_id),
                "duration_ms": duration_ms,
                "stream_local": stream_artifact is not None,
            },
        )
        return DownloadResult(
            url=url,
            artifact_id=str(resolved.artifact_id),
            expires_in=expires_in,
            stream_artifact=stream_artifact,
        )

    @staticmethod
    def _require_uuid(value: Any) -> str:
        if value is None or value == "":
            raise WorkspaceReportDownloadValidationError("report_id is required.")
        try:
            return str(UUID(str(value)))
        except (ValueError, TypeError, AttributeError) as exc:
            raise WorkspaceReportDownloadValidationError(
                "Invalid report_id: must be a UUID."
            ) from exc

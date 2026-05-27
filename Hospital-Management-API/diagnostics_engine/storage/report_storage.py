"""Object storage helpers for diagnostic report artifacts."""

from __future__ import annotations

from django.core.files.storage import default_storage

from diagnostics_engine.models.reports import DiagnosticReportArtifact
from diagnostics_engine.storage.s3_report_storage import (
    delete_object,
    generate_presigned_download_url,
    reports_s3_enabled,
)


class ReportStorageService:
    """Thin wrapper over Django file storage for report blobs."""

    @staticmethod
    def storage_path(artifact: DiagnosticReportArtifact) -> str | None:
        return artifact.storage_path or (artifact.file.name if artifact.file else None)

    @staticmethod
    def download_url(artifact: DiagnosticReportArtifact, *, expires_in: int | None = None) -> str | None:
        """Presigned URL only — never return ``artifact.file.url``."""
        key = ReportStorageService.storage_path(artifact)
        if not key:
            return None
        filename = ReportStorageService.download_filename(artifact)
        url = generate_presigned_download_url(
            key,
            expires_in=expires_in,
            download_filename=filename,
        )
        if url:
            return url
        if not reports_s3_enabled() and artifact.file:
            return None
        return None

    @staticmethod
    def exists(artifact: DiagnosticReportArtifact) -> bool:
        path = ReportStorageService.storage_path(artifact)
        if not path:
            return False
        return default_storage.exists(path)

    @staticmethod
    def open_for_read(artifact: DiagnosticReportArtifact):
        if not artifact.file:
            raise FileNotFoundError("Artifact has no file.")
        return artifact.file.open("rb")

    @staticmethod
    def download_filename(artifact: DiagnosticReportArtifact) -> str:
        return artifact.download_filename or artifact.stored_filename or "report.pdf"

    @staticmethod
    def delete_storage_object(storage_key: str) -> bool:
        return delete_object(storage_key)

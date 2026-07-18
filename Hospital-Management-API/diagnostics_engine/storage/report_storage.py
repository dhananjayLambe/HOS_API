"""Object storage helpers for diagnostic report artifacts."""

from __future__ import annotations

from typing import Literal

from diagnostics_engine.models.reports import DiagnosticReportArtifact
from diagnostics_engine.storage.providers import DefaultStorageProvider
from diagnostics_engine.storage.s3_report_storage import (
    generate_presigned_download_url,
)

Disposition = Literal["attachment", "inline"]


class ReportStorageService:
    """Thin wrapper over Django file storage for report blobs."""
    provider = DefaultStorageProvider()

    @staticmethod
    def storage_path(artifact: DiagnosticReportArtifact) -> str | None:
        return artifact.storage_key

    @staticmethod
    def download_url(
        artifact: DiagnosticReportArtifact,
        *,
        expires_in: int | None = None,
        disposition: Disposition = "attachment",
    ) -> str | None:
        """Presigned URL when S3 mode is on; ``None`` for local (workspace streams bytes)."""
        key = ReportStorageService.storage_path(artifact)
        if not key:
            return None
        filename = ReportStorageService.download_filename(artifact)
        url = generate_presigned_download_url(
            key,
            expires_in=expires_in,
            download_filename=filename,
            disposition=disposition,
        )
        return url

    @staticmethod
    def preview_url(
        artifact: DiagnosticReportArtifact,
        *,
        expires_in: int | None = None,
    ) -> str | None:
        """Presigned URL with inline disposition for browser preview."""
        return ReportStorageService.download_url(
            artifact,
            expires_in=expires_in,
            disposition="inline",
        )

    @staticmethod
    def exists(artifact: DiagnosticReportArtifact) -> bool:
        path = ReportStorageService.storage_path(artifact)
        if not path:
            return False
        return ReportStorageService.provider.exists(path)

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
        return ReportStorageService.provider.delete(storage_key)

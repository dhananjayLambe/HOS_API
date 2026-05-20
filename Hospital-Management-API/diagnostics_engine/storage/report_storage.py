"""Object storage helpers for diagnostic report artifacts."""

from __future__ import annotations

from django.core.files.storage import default_storage

from diagnostics_engine.models.reports import DiagnosticReportArtifact


class ReportStorageService:
    """Thin wrapper over Django file storage for report blobs."""

    @staticmethod
    def storage_path(artifact: DiagnosticReportArtifact) -> str | None:
        return artifact.storage_path or (artifact.file.name if artifact.file else None)

    @staticmethod
    def download_url(artifact: DiagnosticReportArtifact) -> str | None:
        if not artifact.file:
            return None
        return artifact.file.url

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

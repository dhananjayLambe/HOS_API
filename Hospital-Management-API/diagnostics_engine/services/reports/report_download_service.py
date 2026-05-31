"""Presigned download orchestration for diagnostic reports."""

from __future__ import annotations

from django.conf import settings
from django.core.exceptions import ValidationError

from diagnostics_engine.domain.reports import get_primary_artifact
from diagnostics_engine.monitoring.report_events import safe_emit
from diagnostics_engine.services.reports.report_audit import emit_report_audit_event
from diagnostics_engine.services.reports.report_validation_service import ReportValidationService
from diagnostics_engine.storage.report_storage import ReportStorageService
from diagnostics_engine.storage.s3_report_storage import generate_presigned_download_url


class ReportDownloadService:
    """Resolve primary artifact and issue a time-limited download URL."""

    @classmethod
    def build_download_response(cls, *, report, user=None) -> dict:
        ReportValidationService.validate_report_active(report)
        ReportValidationService.validate_report_not_superseded(report)

        artifact = get_primary_artifact(report)
        if artifact is None or not artifact.is_active:
            raise ValidationError("No downloadable artifact found for this report.")

        storage_key = ReportStorageService.storage_path(artifact)
        if not storage_key or not ReportStorageService.exists(artifact):
            raise ValidationError("Report file is not available.")

        expires_in = int(getattr(settings, "REPORT_PRESIGNED_URL_EXPIRY_SECONDS", 300))
        filename = ReportStorageService.download_filename(artifact)
        download_url = generate_presigned_download_url(
            storage_key,
            expires_in=expires_in,
            download_filename=filename,
        )

        if not download_url:
            download_url = cls._local_download_fallback(report, artifact)

        safe_emit(
            emit_report_audit_event,
            action="report_download_requested",
            report=report,
            user=user,
            metadata={"artifact_id": str(artifact.id), "expires_in": expires_in},
        )

        return {
            "download_url": download_url,
            "expires_in": expires_in,
            "filename": filename,
            "artifact_id": str(artifact.id),
        }

    @staticmethod
    def build_delivery_download_url(*, report, artifact) -> tuple[str, str]:
        """Token + URL for delivery logs (never raw S3 URL in persistent metadata when possible)."""
        payload = ReportDownloadService.build_download_response(report=report, user=None)
        token = payload["artifact_id"]
        return payload["download_url"], token

    @staticmethod
    def _local_download_fallback(report, artifact) -> str:
        """Dev fallback: stream bytes from API (never metadata self-loop)."""
        del artifact
        base = getattr(settings, "REPORT_PUBLIC_DOWNLOAD_BASE_URL", "").rstrip("/")
        if base:
            return f"{base}/{report.id}?stream=1"
        return f"/api/v1/diagnostics/reports/{report.id}/download/?stream=1"

"""ArtifactAccessService — opaque preview/download URL issuance (no boto3 in workspace)."""

from __future__ import annotations

from typing import Any

from django.conf import settings

from diagnostics_engine.storage.report_storage import ReportStorageService


class ArtifactAccessError(Exception):
    """Unable to issue an access URL for the artifact."""


class ArtifactAccessService:
    """Storage-agnostic access layer. Never returns bucket or object key."""

    @classmethod
    def generate_download_url(
        cls,
        artifact: Any,
        *,
        expires_in: int | None = None,
    ) -> str:
        ttl = cls._ttl(expires_in)
        url = ReportStorageService.download_url(
            artifact,
            expires_in=ttl,
            disposition="attachment",
        )
        if not url:
            raise ArtifactAccessError("Download URL is unavailable for this artifact.")
        return str(url)

    @classmethod
    def generate_preview_url(
        cls,
        artifact: Any,
        *,
        expires_in: int | None = None,
    ) -> str:
        ttl = cls._ttl(expires_in)
        url = ReportStorageService.preview_url(artifact, expires_in=ttl)
        if not url:
            raise ArtifactAccessError("Preview URL is unavailable for this artifact.")
        return str(url)

    @classmethod
    def default_expires_in(cls) -> int:
        return int(getattr(settings, "REPORT_PRESIGNED_URL_EXPIRY_SECONDS", 300))

    @classmethod
    def _ttl(cls, expires_in: int | None) -> int:
        return expires_in if expires_in is not None else cls.default_expires_in()

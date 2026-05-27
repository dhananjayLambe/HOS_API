"""AWS S3 helpers for diagnostic report artifacts (presigned URLs, delete)."""

from __future__ import annotations

import logging
from typing import Any

from django.conf import settings

logger = logging.getLogger("diagnostics.reports")


def reports_s3_enabled() -> bool:
    return bool(getattr(settings, "AWS_REPORTS_BUCKET", None))


def _s3_client():
    import boto3

    kwargs: dict[str, Any] = {}
    region = getattr(settings, "AWS_S3_REGION_NAME", None)
    if region:
        kwargs["region_name"] = region
    return boto3.client("s3", **kwargs)


def generate_presigned_download_url(
    storage_key: str,
    *,
    expires_in: int | None = None,
    download_filename: str | None = None,
) -> str | None:
    """
    Return a time-limited GET URL for an object key.

    Falls back to None when S3 is not configured (local dev uses file storage).
    """
    if not storage_key or not reports_s3_enabled():
        return None

    expiry = expires_in if expires_in is not None else int(
        getattr(settings, "REPORT_PRESIGNED_URL_EXPIRY_SECONDS", 300)
    )
    params: dict[str, Any] = {
        "Bucket": settings.AWS_REPORTS_BUCKET,
        "Key": storage_key,
    }
    if download_filename:
        params["ResponseContentDisposition"] = f'attachment; filename="{download_filename}"'

    try:
        return _s3_client().generate_presigned_url(
            "get_object",
            Params=params,
            ExpiresIn=expiry,
        )
    except Exception:
        logger.exception("presigned_url_failed key=%s", storage_key)
        return None


def delete_object(storage_key: str) -> bool:
    """Best-effort delete for upload rollback. Returns True if removed or absent."""
    if not storage_key:
        return True
    if reports_s3_enabled():
        try:
            _s3_client().delete_object(
                Bucket=settings.AWS_REPORTS_BUCKET,
                Key=storage_key,
            )
            return True
        except Exception:
            logger.exception("s3_delete_failed key=%s", storage_key)
            return False

    from django.core.files.storage import default_storage

    try:
        if default_storage.exists(storage_key):
            default_storage.delete(storage_key)
        return True
    except Exception:
        logger.exception("storage_delete_failed key=%s", storage_key)
        return False

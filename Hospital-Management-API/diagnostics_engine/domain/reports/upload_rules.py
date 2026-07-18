"""Shared upload validation rules for report artifacts (domain layer)."""

from __future__ import annotations

import hashlib
import logging
import mimetypes
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError

from diagnostics_engine.models.reports import ReportArtifactType

logger = logging.getLogger(__name__)

DEFAULT_MAX_REPORT_UPLOAD_SIZE_MB = 25
DEFAULT_MAX_REPORT_BATCH_UPLOAD_SIZE_MB = 100
DEFAULT_MAX_REPORT_UPLOAD_FILES = 10

ALLOWED_EXTENSIONS = frozenset(
    {
        "pdf",
        "jpg",
        "jpeg",
        "png",
        "csv",
        "xlsx",
        "xls",
        "docx",
        "doc",
        "txt",
        "zip",
        "dcm",
    }
)
BLOCKED_EXTENSIONS = frozenset(
    {
        "exe",
        "bat",
        "cmd",
        "com",
        "sh",
        "bash",
        "dll",
        "msi",
        "js",
        "html",
        "htm",
        "php",
        "py",
        "jar",
        "app",
        "deb",
        "rpm",
    }
)

EXTENSION_TO_ARTIFACT_TYPE: dict[str, str] = {
    "pdf": ReportArtifactType.PDF,
    "jpg": ReportArtifactType.IMAGE,
    "jpeg": ReportArtifactType.IMAGE,
    "png": ReportArtifactType.IMAGE,
    "csv": ReportArtifactType.CSV,
    "xlsx": ReportArtifactType.XLSX,
    "xls": ReportArtifactType.XLSX,
    "docx": ReportArtifactType.DOCX,
    "doc": ReportArtifactType.DOCX,
    "txt": ReportArtifactType.TXT,
    "zip": ReportArtifactType.ZIP,
    "dcm": ReportArtifactType.DICOM,
}

EXPECTED_MIME_BY_EXT: dict[str, frozenset[str]] = {
    "pdf": frozenset({"application/pdf"}),
    "jpg": frozenset({"image/jpeg"}),
    "jpeg": frozenset({"image/jpeg"}),
    "png": frozenset({"image/png"}),
    "csv": frozenset({"text/csv", "application/csv", "application/vnd.ms-excel"}),
    "xlsx": frozenset(
        {
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel",
        }
    ),
    "xls": frozenset({"application/vnd.ms-excel"}),
    "docx": frozenset(
        {
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword",
        }
    ),
    "doc": frozenset({"application/msword"}),
    "txt": frozenset({"text/plain"}),
    "zip": frozenset({"application/zip", "application/x-zip-compressed"}),
    "dcm": frozenset({"application/dicom", "application/octet-stream"}),
}

GENERIC_MIME_HINTS = frozenset(
    {"application/octet-stream", "binary/octet-stream", "application/x-msdownload"}
)

_SPOOFING_MIME_HINTS = frozenset(
    {
        "application/javascript",
        "text/javascript",
        "application/x-javascript",
        "application/x-sh",
        "application/x-php",
        "text/html",
        "application/xhtml+xml",
    }
)


def max_file_bytes() -> int:
    mb = getattr(settings, "MAX_REPORT_UPLOAD_SIZE_MB", DEFAULT_MAX_REPORT_UPLOAD_SIZE_MB)
    return int(mb) * 1024 * 1024


def max_batch_bytes() -> int:
    mb = getattr(
        settings,
        "MAX_REPORT_BATCH_UPLOAD_SIZE_MB",
        DEFAULT_MAX_REPORT_BATCH_UPLOAD_SIZE_MB,
    )
    return int(mb) * 1024 * 1024


def max_file_count() -> int:
    return int(getattr(settings, "MAX_REPORT_UPLOAD_FILES", DEFAULT_MAX_REPORT_UPLOAD_FILES))


def original_filename(file) -> str:
    name = getattr(file, "name", None) or ""
    return name.split("/")[-1].strip()


def normalized_extension(filename: str) -> str:
    return Path(filename).suffix.lower().lstrip(".")


def file_size(file) -> int:
    size = getattr(file, "size", None)
    if size is not None:
        return int(size)
    if hasattr(file, "seek") and hasattr(file, "tell"):
        pos = file.tell()
        file.seek(0, 2)
        size = file.tell()
        file.seek(pos)
        return int(size)
    return 0


def compute_file_checksum(file) -> str:
    """SHA256 of file contents; rewinds readable streams to position 0."""
    digest = hashlib.sha256()
    if hasattr(file, "chunks"):
        for chunk in file.chunks():
            digest.update(chunk)
    elif hasattr(file, "read"):
        for chunk in iter(lambda: file.read(8192), b""):
            digest.update(chunk)
    else:
        raise ValidationError("Uploaded file is not readable.")
    if hasattr(file, "seek"):
        file.seek(0)
    return digest.hexdigest()


def validate_file_size(file, *, file_index: int = 0) -> None:
    name = original_filename(file)
    if not name:
        raise ValidationError(f"File at index {file_index} has no filename.")
    size = file_size(file)
    if size <= 0:
        raise ValidationError(f"File '{name}' is empty.")
    if size > max_file_bytes():
        raise ValidationError(f"File '{name}' exceeds the maximum upload size.")


def validate_batch_total_size(files: list) -> None:
    total_size = sum(file_size(f) for f in files)
    if total_size > max_batch_bytes():
        raise ValidationError("Total upload size exceeds the maximum allowed for a single batch.")


def validate_batch_limits(files: list) -> None:
    limit = max_file_count()
    if len(files) > limit:
        raise ValidationError(f"Cannot upload more than {limit} files per batch.")
    validate_batch_total_size(files)


def validate_primary_file_index(primary_file_index: int, file_count: int) -> None:
    if primary_file_index < 0 or primary_file_index >= file_count:
        raise ValueError(
            f"primary_file_index must be between 0 and {file_count - 1}, "
            f"got {primary_file_index}."
        )


def validate_mime_consistency(file, extension: str, *, file_index: int = 0) -> None:
    content_type = (getattr(file, "content_type", None) or "").strip().lower()
    if not content_type or content_type in GENERIC_MIME_HINTS:
        return
    expected = EXPECTED_MIME_BY_EXT.get(extension)
    if expected and content_type not in expected:
        if content_type in _SPOOFING_MIME_HINTS:
            logger.warning(
                "artifact_upload_mime_spoofing index=%s ext=%s content_type=%s",
                file_index,
                extension,
                content_type,
            )
            return
        logger.debug(
            "artifact_upload_mime_mismatch index=%s ext=%s content_type=%s expected=%s",
            file_index,
            extension,
            content_type,
            sorted(expected),
        )


def validate_uploaded_file(file, *, file_index: int = 0) -> None:
    if file is None:
        raise ValidationError(f"File at index {file_index} is missing.")

    name = original_filename(file)
    if not name:
        raise ValidationError(f"File at index {file_index} has no filename.")

    extension = normalized_extension(name)
    if extension in BLOCKED_EXTENSIONS:
        logger.warning(
            "artifact_upload_blocked_extension ext=%s index=%s",
            extension,
            file_index,
        )
        raise ValidationError(f"File type '.{extension}' is not allowed.")
    if extension not in ALLOWED_EXTENSIONS:
        raise ValidationError(f"File type '.{extension}' is not supported.")

    validate_file_size(file, file_index=file_index)
    validate_mime_consistency(file, extension, file_index=file_index)


def warn_mime_mismatch(file, extension: str, *, file_index: int) -> None:
    """Backward-compatible alias for validate_mime_consistency."""
    validate_mime_consistency(file, extension, file_index=file_index)


def infer_artifact_type(filename: str, content_type: str | None, extension: str) -> str:
    del content_type
    if extension in EXTENSION_TO_ARTIFACT_TYPE:
        return EXTENSION_TO_ARTIFACT_TYPE[extension]
    raise ValidationError(f"Cannot determine artifact type for '{filename}'.")

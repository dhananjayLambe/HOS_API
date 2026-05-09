"""
Structured media paths for the Labs module (local storage, S3-ready layout).

Paths are organization- and branch-scoped. Stored filenames are UUID-based;
only the file extension is taken from the upload (never the original basename).
"""

from __future__ import annotations

import os
import re
import uuid
from pathlib import Path


# Extensions allowed for compliance / branch uploads (healthcare-safe, predictable)
_ALLOWED_EXTENSIONS: frozenset[str] = frozenset(
    {
        ".pdf",
        ".png",
        ".jpg",
        ".jpeg",
        ".webp",
        ".gif",
        ".svg",
        ".tif",
        ".tiff",
    }
)


def _normalize_relative_path(path: str) -> str:
    """Return a forward-slash path under MEDIA_ROOT (portable for cloud migration)."""
    return path.replace("\\", "/")


def _safe_extension(filename: str) -> str:
    """
    Take only the suffix from the incoming name; never use the original basename.
    Falls back to .bin if missing or disallowed.
    """
    ext = Path(filename or "").suffix.lower()
    if not ext or len(ext) > 8:
        return ".bin"
    if ext not in _ALLOWED_EXTENSIONS:
        return ".bin"
    if not re.match(r"^\.[a-z0-9]{2,7}$", ext):
        return ".bin"
    return ext


def lab_document_upload_path(instance, filename: str) -> str:
    """
    Compliance / operational documents for a lab organization.

    layout: labs/organizations/<organization_id>/documents/<uuid><ext>
    """
    org_id = getattr(instance, "organization_id", None)
    if org_id is None:
        raise ValueError("lab_document_upload_path requires LabDocument.organization_id to be set.")
    ext = _safe_extension(filename)
    unique = uuid.uuid4().hex
    rel = os.path.join("labs", "organizations", str(org_id), "documents", f"{unique}{ext}")
    return _normalize_relative_path(rel)


def lab_logo_upload_path(instance, filename: str) -> str:
    """
    Organization logo; fixed basename ``logo`` so updates overwrite the same logical asset.

    layout: labs/organizations/<organization_id>/logo/logo<ext>
    """
    pk = getattr(instance, "pk", None)
    if pk is None:
        raise ValueError("lab_logo_upload_path requires a saved LabOrganization (primary key).")
    ext = _safe_extension(filename)
    rel = os.path.join("labs", "organizations", str(pk), "logo", f"logo{ext}")
    return _normalize_relative_path(rel)


def lab_branch_file_upload_path(instance, filename: str) -> str:
    """
    Branch-scoped files (photos, certificates, local documents).

    layout: labs/branches/<branch_id>/<uuid><ext>

    Wire this to branch FileField/ImageField models when added.
    """
    pk = getattr(instance, "pk", None)
    if pk is None:
        raise ValueError("lab_branch_file_upload_path requires a saved LabBranch (primary key).")
    ext = _safe_extension(filename)
    unique = uuid.uuid4().hex
    rel = os.path.join("labs", "branches", str(pk), f"{unique}{ext}")
    return _normalize_relative_path(rel)

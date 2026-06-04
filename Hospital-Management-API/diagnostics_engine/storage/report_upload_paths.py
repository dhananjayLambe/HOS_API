"""
Object-storage relative keys for diagnostic report artifact uploads.

Used as Django ``FileField.upload_to`` for ``DiagnosticReportArtifact``.
The returned string is stored on the artifact as ``storage_path`` / ``storage_key``
and is resolved under:

- **Local dev:** ``{MEDIA_ROOT}/<key>``  (see ``main.settings.MEDIA_ROOT``)
- **Production:** ``AWS_REPORTS_BUCKET`` object key ``<key>`` when S3 is configured

This module only defines the blob layout. Business lookups use database IDs,
not path parsing.
"""

from __future__ import annotations

import uuid
from pathlib import Path

from django.utils import timezone


def _resolve_encounter_id(instance) -> str:
    try:
        encounter = instance.report.order_test_line.order.encounter
        if encounter:
            return str(encounter.id)
    except AttributeError:
        pass
    return "unknown-encounter"


def _resolve_patient_profile_id(instance) -> str:
    try:
        profile = instance.report.order_test_line.order.patient_profile
        if profile:
            return str(profile.id)
    except AttributeError:
        pass
    return "unknown-patient"


def _resolve_patient_account_id(instance) -> str:
    try:
        profile = instance.report.order_test_line.order.patient_profile
        if profile and profile.account_id:
            return str(profile.account_id)
    except AttributeError:
        pass
    return "unknown-account"


def _resolve_artifact_type(instance, filename: str) -> str:
    raw = (getattr(instance, "artifact_type", "") or "").strip().lower()
    if raw:
        return raw
    ext = Path(filename).suffix.lower().replace(".", "")
    return ext or "binary"


def build_report_artifact_upload_path(instance, filename: str) -> str:
    """
    Build the relative storage key for one uploaded report file.

    Path layout (each segment is a directory name; no ``key=value`` prefixes):

        diagnostic-reports/
            active/
                <patient_account_id>/
                    <patient_profile_id>/
                        <YYYY>/
                            <MM>/
                                <encounter_id>/
                                    <report_id>/
                                        <artifact_type>/
                                            artifact_<artifact_id>_v<version><ext>

    Example::

        diagnostic-reports/active/550e8400-e29b-41d4-a716-446655440000/
            6ba7b810-9dad-11d1-80b4-00c04fd430c8/2026/06/
            7c9e6679-7425-40de-944b-e07fc1f90ae7/
            8f14e45f-ceea-467f-a0f8-5c2b5c0b3f1a/pdf/
            artifact_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d_v1.pdf

    Filename fields on the model (not part of this path):

    - ``original_filename`` — name from the uploader (audit)
    - ``stored_filename``     — opaque blob name set here (``artifact_<id>_v<n>.<ext>``)
    - ``download_filename``   — human-readable name for WhatsApp / browser download
    """
    uploaded_at = timezone.now()
    extension = Path(filename).suffix.lower() or ".bin"

    if not instance.id:
        instance.id = uuid.uuid4()

    report_id = str(instance.report_id)
    artifact_id = str(instance.id)
    version = instance.version or 1
    encounter_id = _resolve_encounter_id(instance)
    patient_profile_id = _resolve_patient_profile_id(instance)
    patient_account_id = _resolve_patient_account_id(instance)
    artifact_type = _resolve_artifact_type(instance, filename)

    stored_filename = f"artifact_{artifact_id}_v{version}{extension}"
    instance.stored_filename = stored_filename

    # Relative key: prefix / lifecycle / patient hierarchy / time / clinical context / blob
    return (
        f"diagnostic-reports/"
        f"active/"
        f"{patient_account_id}/"
        f"{patient_profile_id}/"
        f"{uploaded_at:%Y}/"
        f"{uploaded_at:%m}/"
        f"{encounter_id}/"
        f"{report_id}/"
        f"{artifact_type}/"
        f"{stored_filename}"
    )

"""Structured object-storage paths for diagnostic report artifacts."""

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


def build_report_artifact_upload_path(instance, filename: str) -> str:
    """
    Infrastructure-oriented S3/local key — not used for business queries.

    layout:
        diagnostic-reports/
            year=<YYYY>/
                month=<MM>/
                    day=<DD>/
                        encounter=<uuid>/
                            report=<uuid>/
                                artifact_<artifact_id>_v<version><ext>

  Separate from:
    - original_filename  — what the operator uploaded (audit)
    - stored_filename    — opaque blob name (artifact_<id>_v<n>.<ext>)
    - download_filename  — human-readable name for WhatsApp / browser download
    """
    uploaded_at = timezone.now()
    extension = Path(filename).suffix.lower() or ".bin"

    if not instance.id:
        instance.id = uuid.uuid4()

    report_id = str(instance.report_id)
    artifact_id = str(instance.id)
    version = instance.version or 1
    encounter_id = _resolve_encounter_id(instance)

    stored_filename = f"artifact_{artifact_id}_v{version}{extension}"
    instance.stored_filename = stored_filename

    return (
        f"diagnostic-reports/"
        f"year={uploaded_at:%Y}/"
        f"month={uploaded_at:%m}/"
        f"day={uploaded_at:%d}/"
        f"encounter={encounter_id}/"
        f"report={report_id}/"
        f"{stored_filename}"
    )

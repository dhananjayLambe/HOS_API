"""Doctor dashboard reports tab aggregation."""

from __future__ import annotations

from datetime import datetime

from django.core.cache import cache
from django.utils import timezone

from diagnostics_engine.api.services.doctor_report_counts import (
    count_pending_doctor_reports,
    count_pending_upload,
    count_reports_received_today,
    count_reviewed_today,
)
from diagnostics_engine.domain.reports.active_report import get_primary_artifact
from doctor.api.services.dashboard_report_queries import (
    get_pending_upload_queryset,
    get_ready_reports_queryset,
    get_recent_activity_queryset,
)

CACHE_TTL_SECONDS = 15
DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE = 50
ALLOWED_PAGE_SIZES = {5, 10, 25, 50}
ACTIVITY_LIMIT = 10

STATUS_READY_FOR_REVIEW = "READY_FOR_REVIEW"
STATUS_PENDING_UPLOAD = "PENDING_UPLOAD"

REVIEW_STATUS_SORT_ORDER = {
    STATUS_PENDING_UPLOAD: 0,
    STATUS_READY_FOR_REVIEW: 1,
}


def _normalize_page_size(raw) -> int:
    try:
        value = int(raw or DEFAULT_PAGE_SIZE)
    except (TypeError, ValueError):
        return DEFAULT_PAGE_SIZE
    if value in ALLOWED_PAGE_SIZES:
        return value
    if 1 <= value <= MAX_PAGE_SIZE:
        return value
    return DEFAULT_PAGE_SIZE


def _patient_full_name(profile) -> str:
    if not profile:
        return ""
    return f"{(profile.first_name or '').strip()} {(profile.last_name or '').strip()}".strip()


def _iso_datetime(value) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime) and timezone.is_aware(value):
        return value.isoformat()
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _visit_date_from_encounter(encounter) -> str | None:
    if not encounter or not encounter.created_at:
        return None
    created = encounter.created_at
    if hasattr(created, "date"):
        return created.date().isoformat()
    return str(created)


def _report_type_from_line(line) -> str:
    service = getattr(line, "service", None)
    return service.name if service and service.name else "Diagnostic report"


def _build_ready_report_row(report) -> dict:
    order = report.order_test_line.order
    profile = order.patient_profile
    encounter = order.encounter
    uploaded_at = report.uploaded_at
    primary = get_primary_artifact(report)
    if primary and primary.uploaded_at:
        uploaded_at = primary.uploaded_at

    return {
        "report_id": str(report.id),
        "patient_id": str(profile.id) if profile else None,
        "patient_name": _patient_full_name(profile),
        "encounter_id": str(encounter.id) if encounter else None,
        "visit_date": _visit_date_from_encounter(encounter),
        "report_type": _report_type_from_line(report.order_test_line),
        "uploaded_at": _iso_datetime(uploaded_at),
        "review_status": STATUS_READY_FOR_REVIEW,
        "priority": "NORMAL",
        "is_critical": False,
        "doctor_acknowledged": False,
        "whatsapp_sent": False,
        "_sort_bucket": REVIEW_STATUS_SORT_ORDER[STATUS_READY_FOR_REVIEW],
        "_sort_ts": uploaded_at or report.updated_at,
    }


def _build_pending_upload_row(line) -> dict:
    order = line.order
    profile = order.patient_profile
    encounter = order.encounter

    return {
        "report_id": None,
        "patient_id": str(profile.id) if profile else None,
        "patient_name": _patient_full_name(profile),
        "encounter_id": str(encounter.id) if encounter else None,
        "visit_date": _visit_date_from_encounter(encounter),
        "report_type": _report_type_from_line(line),
        "uploaded_at": None,
        "review_status": STATUS_PENDING_UPLOAD,
        "priority": "NORMAL",
        "is_critical": False,
        "doctor_acknowledged": False,
        "whatsapp_sent": False,
        "_sort_bucket": REVIEW_STATUS_SORT_ORDER[STATUS_PENDING_UPLOAD],
        "_sort_ts": line.updated_at,
    }


def _build_work_queue(*, doctor_id, clinic_id, page: int, page_size: int) -> dict:
    ready_rows = [_build_ready_report_row(r) for r in get_ready_reports_queryset(doctor_id=doctor_id, clinic_id=clinic_id)]
    pending_rows = [
        _build_pending_upload_row(line)
        for line in get_pending_upload_queryset(doctor_id=doctor_id, clinic_id=clinic_id)
    ]

    combined = ready_rows + pending_rows
    combined.sort(
        key=lambda row: (
            row["_sort_bucket"],
            -(row["_sort_ts"].timestamp() if row["_sort_ts"] else 0),
        )
    )

    total_count = len(combined)
    start = (page - 1) * page_size
    page_rows = combined[start : start + page_size]

    results = []
    for row in page_rows:
        payload = {k: v for k, v in row.items() if not k.startswith("_")}
        results.append(payload)

    return {"count": total_count, "results": results}


def _build_recent_activity(*, doctor_id, clinic_id) -> list[dict]:
    events = get_recent_activity_queryset(doctor_id=doctor_id, clinic_id=clinic_id)
    return [
        {k: v for k, v in event.items() if not k.startswith("_")}
        for event in events[:ACTIVITY_LIMIT]
    ]


def _build_insights(*, doctor_id, clinic_id) -> dict:
    return {
        "ready_for_review": count_pending_doctor_reports(doctor_id=doctor_id, clinic_id=clinic_id),
        "reviewed_today": count_reviewed_today(doctor_id=doctor_id, clinic_id=clinic_id),
        "pending_upload": count_pending_upload(doctor_id=doctor_id, clinic_id=clinic_id),
        "reports_received_today": count_reports_received_today(doctor_id=doctor_id, clinic_id=clinic_id),
    }


def build_doctor_reports_dashboard(
    *,
    doctor_id,
    clinic_id,
    page: int = 1,
    page_size: int = DEFAULT_PAGE_SIZE,
    use_cache: bool = True,
) -> dict:
    page = max(int(page or 1), 1)
    page_size = _normalize_page_size(page_size)
    cache_key = f"doctor_reports_dashboard:{doctor_id}:{clinic_id}:{page}:{page_size}"

    if use_cache:
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

    payload = {
        "insights": _build_insights(doctor_id=doctor_id, clinic_id=clinic_id),
        "reports": _build_work_queue(
            doctor_id=doctor_id,
            clinic_id=clinic_id,
            page=page,
            page_size=page_size,
        ),
        "recent_activity": _build_recent_activity(doctor_id=doctor_id, clinic_id=clinic_id),
    }

    if use_cache:
        cache.set(cache_key, payload, timeout=CACHE_TTL_SECONDS)

    return payload

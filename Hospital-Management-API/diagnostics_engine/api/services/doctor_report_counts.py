"""Shared doctor dashboard diagnostic report counts."""

from __future__ import annotations

from django.utils import timezone

from doctor.api.services.dashboard_report_queries import (
    get_pending_upload_queryset,
    get_primary_artifact_uploaded_today_filter,
    get_ready_reports_queryset,
    get_scoped_reports_queryset,
)


def count_pending_doctor_reports(*, doctor_id, clinic_id) -> int:
    """
    READY reports awaiting doctor review with at least one uploaded artifact.
    Single source of truth for pending / ready-for-review counts.
    """
    return get_ready_reports_queryset(doctor_id=doctor_id, clinic_id=clinic_id).count()


def count_ready_for_review(*, doctor_id, clinic_id) -> int:
    return count_pending_doctor_reports(doctor_id=doctor_id, clinic_id=clinic_id)


def count_reviewed_today(*, doctor_id, clinic_id) -> int:
    today = timezone.localdate()
    return (
        get_scoped_reports_queryset(doctor_id=doctor_id, clinic_id=clinic_id)
        .filter(reviewed_at__date=today)
        .count()
    )


def count_reports_received_today(*, doctor_id, clinic_id) -> int:
    return (
        get_scoped_reports_queryset(doctor_id=doctor_id, clinic_id=clinic_id)
        .annotate(_artifact_uploaded_today=get_primary_artifact_uploaded_today_filter())
        .filter(_artifact_uploaded_today=True)
        .count()
    )


def count_pending_upload(*, doctor_id, clinic_id) -> int:
    return get_pending_upload_queryset(doctor_id=doctor_id, clinic_id=clinic_id).count()

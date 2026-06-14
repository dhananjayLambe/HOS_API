"""Reusable doctor dashboard diagnostic report querysets."""

from __future__ import annotations

from datetime import timedelta

from django.db.models import Exists, OuterRef, Q
from django.utils import timezone

from diagnostics_engine.domain.reports.active_report import active_reports_queryset, get_primary_artifact
from diagnostics_engine.models.choices import OrderTestLineStatus, ReportLifecycleStatus
from diagnostics_engine.models.orders import DiagnosticOrderTestLine
from diagnostics_engine.models.reports import DiagnosticReportArtifact, DiagnosticTestReport

PENDING_UPLOAD_GRACE_MINUTES = 30
EXCLUDED_ENCOUNTER_STATUSES = ["cancelled", "no_show"]

# Uploaded reports the doctor has not reviewed yet (includes delivered-to-patient rows).
DOCTOR_PENDING_REVIEW_STATUSES = (
    ReportLifecycleStatus.READY,
    ReportLifecycleStatus.DELIVERED,
    ReportLifecycleStatus.IN_PROGRESS,
)


def get_doctor_clinic_scope_filter(*, doctor_id, clinic_id) -> Q:
    doctor_scope = Q(order_test_line__order__encounter__doctor_id=doctor_id) | Q(
        order_test_line__order__doctor_id=doctor_id
    )
    return (
        doctor_scope
        & Q(order_test_line__order__encounter__clinic_id=clinic_id)
        & ~Q(order_test_line__order__encounter__status__in=EXCLUDED_ENCOUNTER_STATUSES)
    )


def get_doctor_clinic_line_scope_filter(*, doctor_id, clinic_id) -> Q:
    doctor_scope = Q(order__encounter__doctor_id=doctor_id) | Q(order__doctor_id=doctor_id)
    return (
        doctor_scope
        & Q(order__encounter__clinic_id=clinic_id)
        & ~Q(order__encounter__status__in=EXCLUDED_ENCOUNTER_STATUSES)
    )


def _has_uploaded_artifact_exists() -> Exists:
    return Exists(
        DiagnosticReportArtifact.objects.filter(
            report_id=OuterRef("pk"),
            is_active=True,
        ).filter(Q(file__gt="") | Q(storage_path__gt=""))
    )


def _has_active_report_for_line_exists() -> Exists:
    superseding = DiagnosticTestReport.objects.filter(
        supersedes_id=OuterRef("pk"),
        deleted_at__isnull=True,
    )
    return Exists(
        DiagnosticTestReport.objects.filter(
            order_test_line_id=OuterRef("pk"),
            deleted_at__isnull=True,
        )
        .annotate(_is_superseded=Exists(superseding))
        .filter(_is_superseded=False)
    )


def get_ready_reports_queryset(*, doctor_id, clinic_id):
    """Uploaded, unreviewed reports awaiting doctor attention."""
    return (
        active_reports_queryset()
        .filter(
            status__in=DOCTOR_PENDING_REVIEW_STATUSES,
            reviewed_at__isnull=True,
        )
        .filter(get_doctor_clinic_scope_filter(doctor_id=doctor_id, clinic_id=clinic_id))
        .annotate(_has_artifact=_has_uploaded_artifact_exists())
        .filter(_has_artifact=True)
        .select_related(
            "order_test_line__order__patient_profile",
            "order_test_line__order__encounter",
            "order_test_line__service",
        )
        .prefetch_related("artifacts")
        .distinct()
    )


def get_scoped_reports_queryset(*, doctor_id, clinic_id):
    """All active doctor-scoped test reports (for activity and daily counts)."""
    return (
        active_reports_queryset()
        .filter(get_doctor_clinic_scope_filter(doctor_id=doctor_id, clinic_id=clinic_id))
        .select_related(
            "order_test_line__order__patient_profile",
            "order_test_line__order__encounter",
            "order_test_line__service",
        )
        .prefetch_related("artifacts")
        .distinct()
    )


def get_pending_upload_queryset(*, doctor_id, clinic_id):
    """
    Completed test lines with no active report, past the grace period.
    Uses line.updated_at as completion proxy (line has no completed_at field).
    """
    grace_cutoff = timezone.now() - timedelta(minutes=PENDING_UPLOAD_GRACE_MINUTES)
    return (
        DiagnosticOrderTestLine.objects.filter(
            status=OrderTestLineStatus.COMPLETED,
            updated_at__lte=grace_cutoff,
        )
        .filter(get_doctor_clinic_line_scope_filter(doctor_id=doctor_id, clinic_id=clinic_id))
        .annotate(_has_active_report=_has_active_report_for_line_exists())
        .filter(_has_active_report=False)
        .select_related(
            "order__patient_profile",
            "order__encounter",
            "service",
        )
        .distinct()
    )


def get_primary_artifact_uploaded_today_filter():
    """Filter reports whose primary artifact was uploaded on local today."""
    today = timezone.localdate()
    return Exists(
        DiagnosticReportArtifact.objects.filter(
            report_id=OuterRef("pk"),
            is_primary=True,
            is_active=True,
            uploaded_at__date=today,
        ).filter(Q(file__gt="") | Q(storage_path__gt=""))
    )


def _patient_full_name(profile) -> str:
    if not profile:
        return ""
    return f"{(profile.first_name or '').strip()} {(profile.last_name or '').strip()}".strip()


def _report_type_from_line(line) -> str:
    service = getattr(line, "service", None)
    return service.name if service and service.name else "Diagnostic report"


def _iso_datetime(value) -> str | None:
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def get_recent_activity_queryset(*, doctor_id, clinic_id) -> list[dict]:
    """
    Collect recent report activity events for the dashboard feed.
    Returns raw event dicts with _sort_ts for ordering (not DB queryset).
    """
    events: list[dict] = []

    scoped_reports = get_scoped_reports_queryset(doctor_id=doctor_id, clinic_id=clinic_id)
    for report in scoped_reports:
        profile = report.order_test_line.order.patient_profile
        patient_name = _patient_full_name(profile)
        report_name = _report_type_from_line(report.order_test_line)

        primary = get_primary_artifact(report)
        artifact_uploaded_at = primary.uploaded_at if primary else None
        if artifact_uploaded_at:
            events.append(
                {
                    "event_type": "REPORT_UPLOADED",
                    "patient_name": patient_name,
                    "report_name": report_name,
                    "timestamp": _iso_datetime(artifact_uploaded_at),
                    "_sort_ts": artifact_uploaded_at,
                }
            )

        if report.reviewed_at:
            events.append(
                {
                    "event_type": "REPORT_REVIEWED",
                    "patient_name": patient_name,
                    "report_name": report_name,
                    "timestamp": _iso_datetime(report.reviewed_at),
                    "_sort_ts": report.reviewed_at,
                }
            )

    for line in get_pending_upload_queryset(doctor_id=doctor_id, clinic_id=clinic_id):
        profile = line.order.patient_profile
        report_name = _report_type_from_line(line)
        events.append(
            {
                "event_type": "REPORT_PENDING_UPLOAD",
                "patient_name": _patient_full_name(profile),
                "report_name": report_name,
                "timestamp": _iso_datetime(line.updated_at),
                "_sort_ts": line.updated_at,
            }
        )

    events.sort(key=lambda e: -(e["_sort_ts"].timestamp() if e["_sort_ts"] else 0))
    return events

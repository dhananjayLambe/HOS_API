from __future__ import annotations

from reports.constants.report_constants import STATUS_CHOICES
from reports.selectors.appointment_report_selectors import (
    appointment_type_counts,
    count_standalone_completed_encounters_for_summary,
    patient_visit_counts,
    status_counts,
)
from reports.utils.date_utils import get_previous_period


SUMMARY_KEYS = (
    "total_appointments",
    "completed",
    "checked_in",
    "cancelled",
    "no_show",
    "walk_in_patients",
    "new_patients",
    "returning_patients",
)


def build_summary(
    current_queryset,
    base_queryset,
    start_date,
    end_date,
    *,
    clinic_id=None,
    doctor_id=None,
    appointment_type=None,
    status=None,
):
    previous_start, previous_end = get_previous_period(start_date, end_date)
    previous_queryset = base_queryset.filter(appointment_date__range=(previous_start, previous_end))

    current_status_counts = status_counts(current_queryset)
    previous_status_counts = status_counts(previous_queryset)
    current_type_counts = appointment_type_counts(current_queryset)
    previous_type_counts = appointment_type_counts(previous_queryset)
    current_visit_split = patient_visit_counts(current_queryset)
    previous_visit_split = patient_visit_counts(previous_queryset)

    current_total = current_queryset.count()
    previous_total = previous_queryset.count()

    enc_current = count_standalone_completed_encounters_for_summary(
        clinic_id=clinic_id,
        doctor_id=doctor_id,
        appointment_type=appointment_type,
        status=status,
        start_date=start_date,
        end_date=end_date,
    )
    enc_previous = count_standalone_completed_encounters_for_summary(
        clinic_id=clinic_id,
        doctor_id=doctor_id,
        appointment_type=appointment_type,
        status=status,
        start_date=previous_start,
        end_date=previous_end,
    )

    current_total_visits = current_total + enc_current
    previous_total_visits = previous_total + enc_previous

    summary = {
        "total_appointments": metric_payload(current_total_visits, previous_total_visits),
        "completed": metric_payload(
            current_status_counts["completed"] + enc_current,
            previous_status_counts["completed"] + enc_previous,
        ),
        "checked_in": metric_payload(current_status_counts["checked_in"], previous_status_counts["checked_in"]),
        "cancelled": metric_payload(current_status_counts["cancelled"], previous_status_counts["cancelled"]),
        "no_show": metric_payload(current_status_counts["no_show"], previous_status_counts["no_show"]),
        "walk_in_patients": metric_payload(
            current_queryset.filter(booking_source="walk_in").count(),
            previous_queryset.filter(booking_source="walk_in").count(),
        ),
        "new_patients": metric_payload(current_visit_split["new_patients"], previous_visit_split["new_patients"]),
        "returning_patients": metric_payload(
            current_visit_split["returning_patients"],
            previous_visit_split["returning_patients"],
        ),
    }
    return summary


def build_status_distribution(current_queryset):
    counts = status_counts(current_queryset)
    total = max(current_queryset.count(), 1)
    return [
        {
            "status": status,
            "count": counts.get(status, 0),
            "percentage": round((counts.get(status, 0) / total) * 100, 2),
        }
        for status in STATUS_CHOICES
    ]


def build_appointment_type_distribution(current_queryset):
    counts = appointment_type_counts(current_queryset)
    total = max(sum(counts.values()), 1)
    return [
        {"type": key, "count": counts[key], "percentage": round((counts[key] / total) * 100, 2)}
        for key in ("walk_in", "scheduled", "follow_up")
    ]


def metric_payload(current_value: int, previous_value: int):
    delta = current_value - previous_value
    if previous_value == 0:
        change_percentage = 100.0 if current_value > 0 else 0.0
    else:
        change_percentage = round((delta / previous_value) * 100, 2)

    if delta > 0:
        trend = "up"
    elif delta < 0:
        trend = "down"
    else:
        trend = "stable"

    return {
        "count": current_value,
        "change_percentage": change_percentage,
        "trend": trend,
    }

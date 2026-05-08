from __future__ import annotations

from collections import defaultdict
from datetime import timedelta

from reports.selectors.appointment_report_selectors import (
    hour_slot_label,
    patient_visit_counts,
    peak_hour_counts,
)


def build_peak_hours(current_queryset):
    rows = peak_hour_counts(current_queryset)
    return [{"slot": hour_slot_label(row["hour"]), "count": row["count"]} for row in rows]


def build_patient_split(current_queryset):
    counts = patient_visit_counts(current_queryset)
    total = counts["new_patients"] + counts["returning_patients"]
    retention_percentage = round((counts["returning_patients"] / total) * 100, 2) if total > 0 else 0.0
    return {
        "new_patients": counts["new_patients"],
        "returning_patients": counts["returning_patients"],
        "retention_percentage": retention_percentage,
    }


def build_operational_summary(current_queryset, daily_trends, peak_hours, patient_split):
    best_day = "N/A"
    if daily_trends:
        best_day_row = max(daily_trends, key=lambda x: x["total"])
        best_day = weekday_label(best_day_row["date"])

    average_daily_footfall = 0
    if daily_trends:
        average_daily_footfall = round(sum(item["total"] for item in daily_trends) / len(daily_trends))

    peak_opd_hour = peak_hours[0]["slot"] if peak_hours else "N/A"
    if peak_hours:
        peak_opd_hour = max(peak_hours, key=lambda x: x["count"])["slot"]

    return {
        "peak_opd_hour": peak_opd_hour,
        "best_attendance_day": best_day,
        "average_daily_footfall": average_daily_footfall,
        "patient_retention_percentage": patient_split["retention_percentage"],
    }


def weekday_label(date_value):
    from datetime import date, datetime

    if hasattr(date_value, "strftime"):
        return date_value.strftime("%A")
    s = str(date_value).strip()
    if not s:
        return "N/A"
    # Accept YYYY-MM-DD or ISO datetime strings from DRF JSON.
    day_part = s[:10]
    try:
        dt = datetime.strptime(day_part, "%Y-%m-%d")
    except ValueError:
        return "N/A"
    return dt.strftime("%A")

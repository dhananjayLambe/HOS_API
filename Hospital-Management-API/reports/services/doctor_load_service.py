from __future__ import annotations

from reports.constants.report_constants import RECENT_APPOINTMENTS_LIMIT, STATUS_BOOKED
from reports.selectors.appointment_report_selectors import doctor_load_rows, recent_appointments


def build_doctor_load(current_queryset, start_date, end_date):
    return doctor_load_rows(current_queryset, start_date, end_date)


def build_recent_appointments(current_queryset):
    rows = recent_appointments(current_queryset, RECENT_APPOINTMENTS_LIMIT)
    normalized = []
    for row in rows:
        visit_type = "Follow-Up" if row["appointment_type"] == "follow_up" else "New"
        if row["booking_source"] == "walk_in":
            appointment_type = "walk_in"
        elif row["appointment_type"] == "follow_up":
            appointment_type = "follow_up"
        else:
            appointment_type = "scheduled"

        status = STATUS_BOOKED if row["status"] == "scheduled" else row["status"]
        slot_start_time = row.get("slot_start_time")
        normalized.append(
            {
                "patient_name": f"{row['patient_profile__first_name']} {row['patient_profile__last_name']}".strip(),
                "visit_type": visit_type.lower().replace("-", "_"),
                "appointment_type": appointment_type,
                "appointment_time": slot_start_time.strftime("%I:%M %p").lstrip("0") if slot_start_time else "",
                "status": status,
            }
        )
    return normalized

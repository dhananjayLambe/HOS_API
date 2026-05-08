from __future__ import annotations

from collections import defaultdict
from datetime import datetime

from django.db.models import Count, Min, Q
from django.db.models.functions import ExtractHour, TruncDate, TruncMonth

from appointments.models import Appointment
from reports.constants.report_constants import STATUS_BOOKED


def build_scoped_queryset(*, clinic_id=None):
    queryset = Appointment.objects.select_related("doctor__user", "patient_profile")

    if clinic_id:
        queryset = queryset.filter(clinic_id=clinic_id)
    return queryset


def build_filtered_queryset(*, queryset, start_date, end_date, doctor_id=None, appointment_type=None, status=None):
    queryset = queryset.filter(appointment_date__range=(start_date, end_date))
    if doctor_id:
        queryset = queryset.filter(doctor_id=doctor_id)
    if appointment_type:
        queryset = filter_by_derived_appointment_type(queryset, appointment_type)
    if status:
        queryset = queryset.filter(status=map_status_for_db(status))
    return queryset


def filter_by_derived_appointment_type(queryset, appointment_type: str):
    if appointment_type == "walk_in":
        return queryset.filter(booking_source="walk_in")
    if appointment_type == "follow_up":
        return queryset.filter(booking_source="online", appointment_type="follow_up")
    if appointment_type == "scheduled":
        return queryset.filter(booking_source="online", appointment_type="new")
    return queryset


def map_status_for_db(status: str) -> str:
    # API uses "booked"; DB stores this state as "scheduled".
    return "scheduled" if status == STATUS_BOOKED else status


def status_counts(queryset):
    raw = queryset.values("status").annotate(count=Count("id"))
    counts = defaultdict(int)
    for row in raw:
        key = STATUS_BOOKED if row["status"] == "scheduled" else row["status"]
        counts[key] += row["count"]
    return counts


def appointment_type_counts(queryset):
    counts = {
        "walk_in": queryset.filter(booking_source="walk_in").count(),
        "scheduled": queryset.filter(booking_source="online", appointment_type="new").count(),
        "follow_up": queryset.filter(booking_source="online", appointment_type="follow_up").count(),
    }
    return counts


def daily_status_counts(queryset):
    rows = (
        queryset.annotate(day=TruncDate("appointment_date"))
        .values("day", "status")
        .annotate(count=Count("id"))
        .order_by("day")
    )
    out = defaultdict(lambda: defaultdict(int))
    for row in rows:
        day = row["day"]
        status = STATUS_BOOKED if row["status"] == "scheduled" else row["status"]
        out[day][status] += row["count"]
        out[day]["total"] += row["count"]
    return out


def monthly_totals(queryset):
    rows = (
        queryset.annotate(month=TruncMonth("appointment_date"))
        .values("month")
        .annotate(appointments=Count("id"))
        .order_by("month")
    )
    return [{"month": row["month"], "appointments": row["appointments"]} for row in rows]


def peak_hour_counts(queryset):
    rows = (
        queryset.annotate(hour=ExtractHour("slot_start_time"))
        .values("hour")
        .annotate(count=Count("id"))
        .order_by("hour")
    )
    return [{"hour": int(row["hour"]), "count": row["count"]} for row in rows if row["hour"] is not None]


def patient_visit_counts(queryset):
    profile_rows = list(queryset.values("patient_profile_id").distinct())
    if not profile_rows:
        return {"new_patients": 0, "returning_patients": 0}

    profile_ids = [row["patient_profile_id"] for row in profile_rows]
    clinic_ids = list(queryset.values_list("clinic_id", flat=True).distinct())

    earliest_appointments = (
        Appointment.objects.filter(patient_profile_id__in=profile_ids, clinic_id__in=clinic_ids)
        .values("patient_profile_id")
        .annotate(first_appointment=Min("appointment_date"))
    )
    first_date_map = {item["patient_profile_id"]: item["first_appointment"] for item in earliest_appointments}

    new_patients = 0
    for patient_id in profile_ids:
        first_date = first_date_map.get(patient_id)
        if first_date and queryset.filter(patient_profile_id=patient_id, appointment_date=first_date).exists():
            new_patients += 1

    returning_patients = max(len(profile_ids) - new_patients, 0)
    return {"new_patients": new_patients, "returning_patients": returning_patients}


def doctor_load_rows(queryset, start_date, end_date):
    total_days = max((end_date - start_date).days + 1, 1)
    rows = (
        queryset.values("doctor_id", "doctor__user__first_name", "doctor__user__last_name")
        .annotate(
            total=Count("id"),
            completed=Count("id", filter=Q(status="completed")),
            cancelled=Count("id", filter=Q(status="cancelled")),
            no_show=Count("id", filter=Q(status="no_show")),
        )
        .order_by("-total")
    )

    doctor_rows = []
    for row in rows:
        total = row["total"]
        doctor_rows.append(
            {
                "doctor_id": row["doctor_id"],
                "doctor_name": f"{row['doctor__user__first_name']} {row['doctor__user__last_name']}".strip(),
                "total": total,
                "completed": row["completed"],
                "cancelled": row["cancelled"],
                "no_show": row["no_show"],
                "average_per_day": round(total / total_days, 2),
            }
        )
    return doctor_rows


def recent_appointments(queryset, limit: int):
    return list(
        queryset.order_by("-appointment_date", "-slot_start_time")[:limit].values(
            "patient_profile__first_name",
            "patient_profile__last_name",
            "appointment_type",
            "booking_source",
            "slot_start_time",
            "status",
        )
    )


def hour_slot_label(hour: int) -> str:
    start = datetime.strptime(str(hour), "%H")
    end = datetime.strptime(str((hour + 1) % 24), "%H")
    return f"{start.strftime('%-I %p')} - {end.strftime('%-I %p')}"

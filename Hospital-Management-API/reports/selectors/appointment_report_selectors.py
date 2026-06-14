from __future__ import annotations

from collections import defaultdict
from datetime import datetime

from django.db.models import Case, CharField, Count, DateTimeField, Exists, F, Min, OuterRef, Q, Value, When
from django.db.models.functions import Coalesce, ExtractHour, TruncDate, TruncMonth

from appointments.models import Appointment
from consultations_core.models.encounter import ClinicalEncounter
from reports.constants.report_constants import STATUS_BOOKED, STATUS_COMPLETED


ENCOUNTER_TERMINAL_COMPLETED_STATUSES = (
    "consultation_completed",
    "closed",
    "completed",  # legacy encounter status
)


def _encounter_no_show_exists():
    """Linked encounter marked no-show while appointment row may still be scheduled/checked_in."""
    return ClinicalEncounter.objects.filter(appointment_id=OuterRef("pk"), status="no_show")


def _encounter_terminal_completed_exists():
    """Consultation finished in EMR while Appointment.status may still be checked_in / scheduled."""
    return ClinicalEncounter.objects.filter(
        appointment_id=OuterRef("pk"),
        status__in=ENCOUNTER_TERMINAL_COMPLETED_STATUSES,
    )


def _encounter_cancelled_exists():
    """Linked encounter cancelled while appointment row may still be scheduled/checked_in."""
    return ClinicalEncounter.objects.filter(appointment_id=OuterRef("pk"), status="cancelled")


def annotate_reporting_status(queryset):
    """
    Derive a single reporting status per appointment row for KPIs and charts.
    ClinicalEncounter is source of truth for terminal states when appointment row lags.
    """
    ns = _encounter_no_show_exists()
    enc_cancelled = _encounter_cancelled_exists()
    enc_done = _encounter_terminal_completed_exists()
    return queryset.annotate(
        reporting_status=Case(
            When(status__in=("completed", "cancelled"), then=F("status")),
            When(status="in_consultation", then=Value("completed")),
            When(Exists(ns), then=Value("no_show")),
            When(Exists(enc_cancelled), then=Value("cancelled")),
            When(Exists(enc_done), then=Value("completed")),
            default=F("status"),
            output_field=CharField(),
        )
    )


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
        db_status = map_status_for_db(status)
        if db_status == "no_show":
            queryset = queryset.filter(Q(status="no_show") | Exists(_encounter_no_show_exists()))
        elif db_status == "completed":
            queryset = queryset.filter(
                Q(status="completed")
                | Q(status="in_consultation")
                | Exists(_encounter_terminal_completed_exists())
            )
        else:
            queryset = queryset.filter(status=db_status)
    return queryset


def filter_by_derived_appointment_type(queryset, appointment_type: str):
    if appointment_type == "walk_in":
        return queryset.filter(booking_source="walk_in")
    if appointment_type == "follow_up":
        return queryset.filter(appointment_type="follow_up")
    if appointment_type == "scheduled":
        return queryset.filter(booking_source="online", appointment_type="new")
    return queryset


def map_status_for_db(status: str) -> str:
    # API uses "booked"; DB stores this state as "scheduled".
    return "scheduled" if status == STATUS_BOOKED else status


def encounter_completion_day_window(qs, start_date, end_date):
    """Restrict encounters by calendar day of completion (standalone EMR visits have no appointment_date)."""
    return (
        qs.annotate(
            _completed_ts=Coalesce(
                "closed_at",
                "consultation_end_time",
                "completed_at",
                "updated_at",
                output_field=DateTimeField(),
            )
        )
        .annotate(_rep_day=TruncDate("_completed_ts"))
        .filter(_rep_day__range=(start_date, end_date))
    )


def filter_encounters_by_report_appointment_type(qs, appointment_type: str | None):
    if appointment_type == "walk_in":
        return qs.filter(encounter_type="walk_in")
    if appointment_type == "follow_up":
        return qs.filter(encounter_type="follow_up")
    if appointment_type == "scheduled":
        return qs.none()
    return qs


def standalone_completed_encounters_queryset(
    *,
    clinic_id=None,
    doctor_id=None,
    appointment_type=None,
    start_date,
    end_date,
):
    qs = ClinicalEncounter.objects.filter(
        appointment__isnull=True,
        status__in=ENCOUNTER_TERMINAL_COMPLETED_STATUSES,
    )
    if clinic_id:
        qs = qs.filter(clinic_id=clinic_id)
    if doctor_id:
        qs = qs.filter(doctor_id=doctor_id)
    qs = filter_encounters_by_report_appointment_type(qs, appointment_type)
    return encounter_completion_day_window(qs, start_date, end_date)


def count_standalone_completed_encounters_for_summary(
    *,
    clinic_id=None,
    doctor_id=None,
    appointment_type=None,
    status=None,
    start_date,
    end_date,
):
    """
    Direct / walk-in consultations often have ClinicalEncounter rows with no Appointment FK.
    Include them in KPI totals only when the appointment-level status filter still represents
    an all-completed or unfiltered view (exclude when filtering to booked, no-show, etc.).
    """
    if status is not None and status != STATUS_COMPLETED:
        return 0
    if appointment_type == "scheduled":
        return 0
    return standalone_completed_encounters_queryset(
        clinic_id=clinic_id,
        doctor_id=doctor_id,
        appointment_type=appointment_type,
        start_date=start_date,
        end_date=end_date,
    ).count()


def standalone_completed_encounters_by_doctor(
    *,
    clinic_id=None,
    doctor_id=None,
    appointment_type=None,
    start_date,
    end_date,
):
    """Per-doctor counts for doctor performance (doctor_load ignores appointment status filter)."""
    if appointment_type == "scheduled":
        return {}
    qs = standalone_completed_encounters_queryset(
        clinic_id=clinic_id,
        doctor_id=doctor_id,
        appointment_type=appointment_type,
        start_date=start_date,
        end_date=end_date,
    ).filter(doctor_id__isnull=False)
    return {row["doctor_id"]: row["c"] for row in qs.values("doctor_id").annotate(c=Count("id"))}


def merge_standalone_encounters_into_doctor_rows(rows: list[dict], **standalone_kw) -> list[dict]:
    from doctor.models import doctor as DoctorModel

    addons = standalone_completed_encounters_by_doctor(**standalone_kw)
    if not addons:
        return rows

    total_days = max((standalone_kw["end_date"] - standalone_kw["start_date"]).days + 1, 1)
    by_id = {r["doctor_id"]: dict(r) for r in rows}

    for doc_pk, add_cnt in addons.items():
        if doc_pk in by_id:
            by_id[doc_pk]["completed"] += add_cnt
            by_id[doc_pk]["total"] += add_cnt
            by_id[doc_pk]["average_per_day"] = round(by_id[doc_pk]["total"] / total_days, 2)
        else:
            doc = DoctorModel.objects.select_related("user").filter(pk=doc_pk).first()
            name = (
                f"{doc.user.first_name} {doc.user.last_name}".strip()
                if doc and doc.user_id
                else "Unknown"
            )
            by_id[doc_pk] = {
                "doctor_id": doc_pk,
                "doctor_name": name,
                "total": add_cnt,
                "completed": add_cnt,
                "cancelled": 0,
                "no_show": 0,
                "average_per_day": round(add_cnt / total_days, 2),
            }

    out = list(by_id.values())
    out.sort(key=lambda r: -r["total"])
    return out


def status_counts(queryset):
    qs = annotate_reporting_status(queryset)
    raw = qs.values("reporting_status").annotate(count=Count("id"))
    counts = defaultdict(int)
    for row in raw:
        rs = row["reporting_status"]
        key = STATUS_BOOKED if rs == "scheduled" else rs
        counts[key] += row["count"]
    return counts


def appointment_type_counts(queryset):
    """Mutually exclusive buckets that sum to queryset.count() when appointment_type is new or follow_up."""
    follow_up = queryset.filter(appointment_type="follow_up").count()
    walk_in = queryset.filter(booking_source="walk_in", appointment_type="new").count()
    scheduled = queryset.filter(booking_source="online", appointment_type="new").count()
    return {
        "walk_in": walk_in,
        "scheduled": scheduled,
        "follow_up": follow_up,
    }


def daily_status_counts(queryset):
    qs = annotate_reporting_status(queryset)
    rows = (
        qs.annotate(day=TruncDate("appointment_date"))
        .values("day", "reporting_status")
        .annotate(count=Count("id"))
        .order_by("day")
    )
    out = defaultdict(lambda: defaultdict(int))
    for row in rows:
        day = row["day"]
        rs = row["reporting_status"]
        status = STATUS_BOOKED if rs == "scheduled" else rs
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
    qs = annotate_reporting_status(queryset)
    rows = (
        qs.values("doctor_id", "doctor__user__first_name", "doctor__user__last_name")
        .annotate(
            total=Count("id"),
            completed=Count("id", filter=Q(reporting_status="completed")),
            cancelled=Count("id", filter=Q(reporting_status="cancelled")),
            no_show=Count("id", filter=Q(reporting_status="no_show")),
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

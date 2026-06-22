"""Shared doctor dashboard metric query helpers."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

from django.db.models import Case, Count, Min, Q, When
from django.db.models.functions import TruncDate

from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.models.prescription import Prescription, PrescriptionStatus

EXCLUDED_ENCOUNTER_STATUSES = ["cancelled", "no_show"]
COMPLETED_ENCOUNTER_STATUS = "consultation_completed"


def get_doctor_clinic_encounter_scope(*, doctor_id, clinic_id) -> Q:
    """Base encounter filter: doctor + clinic, excluding cancelled/no_show."""
    return Q(doctor_id=doctor_id, clinic_id=clinic_id) & ~Q(status__in=EXCLUDED_ENCOUNTER_STATUSES)


def _scoped_encounters(*, doctor_id, clinic_id):
    return ClinicalEncounter.objects.filter(get_doctor_clinic_encounter_scope(doctor_id=doctor_id, clinic_id=clinic_id))


def get_completed_encounters(*, doctor_id, clinic_id, start_date: date, end_date: date):
    """Completed encounters within an inclusive date range (by created_at date)."""
    return _scoped_encounters(doctor_id=doctor_id, clinic_id=clinic_id).filter(
        status=COMPLETED_ENCOUNTER_STATUS,
        created_at__date__gte=start_date,
        created_at__date__lte=end_date,
    )


def count_distinct_patients_with_completed_encounters(
    *,
    doctor_id,
    clinic_id,
    start_date: date,
    end_date: date,
) -> int:
    return (
        get_completed_encounters(
            doctor_id=doctor_id,
            clinic_id=clinic_id,
            start_date=start_date,
            end_date=end_date,
        )
        .values("patient_profile_id")
        .distinct()
        .count()
    )


def count_completed_encounters(
    *,
    doctor_id,
    clinic_id,
    start_date: date,
    end_date: date,
) -> int:
    return get_completed_encounters(
        doctor_id=doctor_id,
        clinic_id=clinic_id,
        start_date=start_date,
        end_date=end_date,
    ).count()


def get_followup_completed_encounters(*, doctor_id, clinic_id, start_date: date, end_date: date):
    """Completed follow-up encounters within date range."""
    return get_completed_encounters(
        doctor_id=doctor_id,
        clinic_id=clinic_id,
        start_date=start_date,
        end_date=end_date,
    ).filter(encounter_type="follow_up")


def count_followup_completed_encounters(
    *,
    doctor_id,
    clinic_id,
    start_date: date,
    end_date: date,
) -> int:
    return get_followup_completed_encounters(
        doctor_id=doctor_id,
        clinic_id=clinic_id,
        start_date=start_date,
        end_date=end_date,
    ).count()


def _duration_end_date(finalized_at, duration_value, duration_unit):
    if not finalized_at or not duration_value or not duration_unit:
        return None
    base = finalized_at.date() if hasattr(finalized_at, "date") else finalized_at
    if duration_unit == "days":
        return base + timedelta(days=duration_value)
    if duration_unit == "weeks":
        return base + timedelta(weeks=duration_value)
    if duration_unit == "months":
        return base + timedelta(days=duration_value * 30)
    return None


def _prescription_treatment_ongoing(prescription, today: date) -> bool:
    if prescription.status != PrescriptionStatus.FINALIZED or not prescription.is_active:
        return False
    if not prescription.finalized_at:
        return False
    lines = prescription.lines.filter(deleted_at__isnull=True)
    for line in lines:
        end = _duration_end_date(
            prescription.finalized_at,
            line.duration_value,
            line.duration_unit,
        )
        if end and end >= today:
            return True
    return False


def get_active_treatment_patient_ids(*, doctor_id, clinic_id, today: date) -> set:
    """Patients with active finalized prescriptions (duration-aware). Single source of truth."""
    patient_ids: set = set()
    prescriptions = (
        Prescription.objects.filter(
            status=PrescriptionStatus.FINALIZED,
            is_active=True,
            finalized_at__isnull=False,
            consultation__encounter__doctor_id=doctor_id,
            consultation__encounter__clinic_id=clinic_id,
        )
        .exclude(consultation__encounter__status__in=EXCLUDED_ENCOUNTER_STATUSES)
        .select_related("consultation__encounter")
        .prefetch_related("lines")
    )
    for prescription in prescriptions:
        if _prescription_treatment_ongoing(prescription, today):
            patient_ids.add(prescription.consultation.encounter.patient_profile_id)
    return patient_ids


def get_new_patient_ids(
    *,
    doctor_id,
    clinic_id,
    start_date: date,
    end_date: date,
) -> set:
    """
    Patients whose first completed encounter at this doctor+clinic falls within the date range.
    Scoped per doctor+clinic (not global).
    """
    rows = (
        _scoped_encounters(doctor_id=doctor_id, clinic_id=clinic_id)
        .filter(status=COMPLETED_ENCOUNTER_STATUS)
        .values("patient_profile_id")
        .annotate(first_completed_date=Min(TruncDate("created_at")))
        .filter(
            first_completed_date__gte=start_date,
            first_completed_date__lte=end_date,
        )
    )
    return {row["patient_profile_id"] for row in rows if row["patient_profile_id"]}


def get_returning_patient_ids(*, doctor_id, clinic_id) -> set:
    """Patients with more than one completed encounter at this doctor+clinic."""
    rows = (
        _scoped_encounters(doctor_id=doctor_id, clinic_id=clinic_id)
        .filter(status=COMPLETED_ENCOUNTER_STATUS)
        .values("patient_profile_id")
        .annotate(completed_count=Count("id"))
        .filter(completed_count__gt=1)
    )
    return {row["patient_profile_id"] for row in rows if row["patient_profile_id"]}


def week_start_date(today: date) -> date:
    """Inclusive start of a 7-day window ending on today."""
    return today - timedelta(days=6)


def month_start_date(today: date) -> date:
    return today.replace(day=1)


@dataclass(frozen=True)
class BatchEncounterMetrics:
    patients_today: int
    patients_this_week: int
    patient_visits_this_month: int
    followups_completed: int
    consultations_completed: int
    consultations_week: int
    followups_week: int
    new_patients_today: int
    new_patients_week: int
    new_patients_mtd: int
    returning_patients: int


def batch_encounter_metrics(*, doctor_id, clinic_id, today: date) -> BatchEncounterMetrics:
    """
    Batched encounter + patient-level metrics for Practice Overview.

    Uses two DB round-trips: one conditional aggregate on completed encounters in the
    relevant date window, and one patient-level stats query for new/returning counts.
    """
    week_start = week_start_date(today)
    month_start = month_start_date(today)
    range_start = min(week_start, month_start)

    completed_qs = get_completed_encounters(
        doctor_id=doctor_id,
        clinic_id=clinic_id,
        start_date=range_start,
        end_date=today,
    )
    encounter_agg = completed_qs.aggregate(
        patients_today=Count(
            "patient_profile_id",
            distinct=True,
            filter=Q(created_at__date=today),
        ),
        patients_this_week=Count(
            "patient_profile_id",
            distinct=True,
            filter=Q(created_at__date__gte=week_start, created_at__date__lte=today),
        ),
        patient_visits_this_month=Count(
            "id",
            filter=Q(created_at__date__gte=month_start, created_at__date__lte=today),
        ),
        followups_completed=Count(
            "id",
            filter=Q(created_at__date=today, encounter_type="follow_up"),
        ),
        consultations_completed=Count("id", filter=Q(created_at__date=today)),
        consultations_week=Count(
            "id",
            filter=Q(created_at__date__gte=week_start, created_at__date__lte=today),
        ),
        followups_week=Count(
            "id",
            filter=Q(created_at__date__gte=week_start, created_at__date__lte=today, encounter_type="follow_up"),
        ),
    )

    patient_stats = (
        _scoped_encounters(doctor_id=doctor_id, clinic_id=clinic_id)
        .filter(status=COMPLETED_ENCOUNTER_STATUS)
        .values("patient_profile_id")
        .annotate(
            completed_count=Count("id"),
            first_completed_date=Min(TruncDate("created_at")),
        )
    )

    new_today = 0
    new_week = 0
    new_mtd = 0
    returning = 0
    for row in patient_stats:
        if not row["patient_profile_id"]:
            continue
        if row["completed_count"] > 1:
            returning += 1
        first_date = row["first_completed_date"]
        if first_date is None:
            continue
        if month_start <= first_date <= today:
            new_mtd += 1
        if week_start <= first_date <= today:
            new_week += 1
        if first_date == today:
            new_today += 1

    return BatchEncounterMetrics(
        patients_today=encounter_agg["patients_today"],
        patients_this_week=encounter_agg["patients_this_week"],
        patient_visits_this_month=encounter_agg["patient_visits_this_month"],
        followups_completed=encounter_agg["followups_completed"],
        consultations_completed=encounter_agg["consultations_completed"],
        consultations_week=encounter_agg["consultations_week"],
        followups_week=encounter_agg["followups_week"],
        new_patients_today=new_today,
        new_patients_week=new_week,
        new_patients_mtd=new_mtd,
        returning_patients=returning,
    )

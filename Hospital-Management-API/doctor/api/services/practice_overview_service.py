"""
Doctor dashboard Practice Overview analytics aggregation.

Metric time windows (all dates use timezone.localdate()):
- patients_today: distinct patients with completed encounter today
- patients_this_week: distinct patients, last 7 days (today - 6 through today)
- patient_visits_this_month: total completed encounters month-to-date
- followups_completed: completed follow-up encounters today
- consultations_completed: all completed encounters today
- consultation_mix.*: appointment/encounter counts for today
- practice_summary.new_patients: first completed encounter at this doctor+clinic MTD
- practice_summary.returning_patients: >1 completed encounters at this doctor+clinic (all time)
- recent_trends: today vs last-7-days for consultations, follow-ups, new patients
"""

from __future__ import annotations

from datetime import date

from django.core.cache import cache
from django.db.models import Case, Count, When
from django.utils import timezone

from appointments.models import Appointment
from consultations_core.models.encounter import ClinicalEncounter
from doctor.api.services.dashboard_metrics_queries import (
    BatchEncounterMetrics,
    batch_encounter_metrics,
    get_active_treatment_patient_ids,
)
from reports.selectors.appointment_report_selectors import annotate_reporting_status

CACHE_TTL_SECONDS = 15


def _iso_generated_at() -> str:
    return timezone.now().isoformat()


def _build_practice_metrics(*, batch: BatchEncounterMetrics) -> dict:
    return {
        "patients_today": batch.patients_today,
        "patients_this_week": batch.patients_this_week,
        "patient_visits_this_month": batch.patient_visits_this_month,
        "followups_completed": batch.followups_completed,
        "consultations_completed": batch.consultations_completed,
    }


def _build_consultation_mix(*, doctor_id, clinic_id, today: date) -> dict:
    appointments_today = Appointment.objects.filter(
        doctor_id=doctor_id,
        clinic_id=clinic_id,
        appointment_date=today,
    )
    annotated = annotate_reporting_status(appointments_today)
    appointment_agg = annotated.aggregate(
        new_consultations=Count(Case(When(appointment_type="new", then=1))),
        followup_consultations=Count(Case(When(appointment_type="follow_up", then=1))),
        cancelled=Count(Case(When(reporting_status="cancelled", then=1))),
        no_show=Count(Case(When(reporting_status="no_show", then=1))),
    )

    standalone_agg = ClinicalEncounter.objects.filter(
        appointment__isnull=True,
        doctor_id=doctor_id,
        clinic_id=clinic_id,
        created_at__date=today,
    ).aggregate(
        walk_in_completed=Count(
            Case(
                When(
                    status="consultation_completed",
                    encounter_type="walk_in",
                    then=1,
                ),
            ),
        ),
        follow_up_completed=Count(
            Case(
                When(
                    status="consultation_completed",
                    encounter_type="follow_up",
                    then=1,
                ),
            ),
        ),
        cancelled=Count(Case(When(status="cancelled", then=1))),
        no_show=Count(Case(When(status="no_show", then=1))),
    )

    return {
        "new_consultations": appointment_agg["new_consultations"] + standalone_agg["walk_in_completed"],
        "followup_consultations": appointment_agg["followup_consultations"] + standalone_agg["follow_up_completed"],
        "cancelled": appointment_agg["cancelled"] + standalone_agg["cancelled"],
        "no_show": appointment_agg["no_show"] + standalone_agg["no_show"],
    }


def _build_practice_summary(*, doctor_id, clinic_id, today: date, batch: BatchEncounterMetrics) -> dict:
    active_ids = get_active_treatment_patient_ids(
        doctor_id=doctor_id,
        clinic_id=clinic_id,
        today=today,
    )
    active_count = len(active_ids)
    return {
        "new_patients": batch.new_patients_mtd,
        "returning_patients": batch.returning_patients,
        "active_treatments": active_count,
        "patients_under_treatment": active_count,
    }


def _build_recent_trends(*, batch: BatchEncounterMetrics) -> list[dict]:
    return [
        {
            "metric_key": "consultations",
            "label": "Consultations",
            "today": batch.consultations_completed,
            "week": batch.consultations_week,
        },
        {
            "metric_key": "follow_ups",
            "label": "Follow-Ups",
            "today": batch.followups_completed,
            "week": batch.followups_week,
        },
        {
            "metric_key": "new_patients",
            "label": "New Patients",
            "today": batch.new_patients_today,
            "week": batch.new_patients_week,
        },
    ]


def _build_v2_reserved_fields() -> dict:
    return {
        "daily_consultations": [],
        "monthly_growth": [],
        "top_diagnoses": [],
        "top_prescribed_medicines": [],
    }


def build_practice_overview(
    *,
    doctor_id,
    clinic_id,
    use_cache: bool = True,
) -> dict:
    cache_key = f"practice_overview:{doctor_id}:{clinic_id}"

    if use_cache:
        cached = cache.get(cache_key)
        if cached is not None:
            return {**cached, "generated_at": _iso_generated_at()}

    today = timezone.localdate()
    batch = batch_encounter_metrics(doctor_id=doctor_id, clinic_id=clinic_id, today=today)
    payload = {
        "generated_at": _iso_generated_at(),
        "practice_metrics": _build_practice_metrics(batch=batch),
        "consultation_mix": _build_consultation_mix(doctor_id=doctor_id, clinic_id=clinic_id, today=today),
        "practice_summary": _build_practice_summary(
            doctor_id=doctor_id,
            clinic_id=clinic_id,
            today=today,
            batch=batch,
        ),
        "recent_trends": _build_recent_trends(batch=batch),
        "v2_analytics": _build_v2_reserved_fields(),
    }

    if use_cache:
        cache.set(cache_key, payload, timeout=CACHE_TTL_SECONDS)

    return payload

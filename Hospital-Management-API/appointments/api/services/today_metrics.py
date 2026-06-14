"""Today's doctor schedule KPIs — encounter-aware counts aligned with helpdesk/reports."""

from __future__ import annotations

from datetime import date

from appointments.models import Appointment
from consultations_core.models.encounter import ClinicalEncounter
from reports.selectors.appointment_report_selectors import (
    count_standalone_completed_encounters_for_summary,
    encounter_completion_day_window,
    status_counts,
)


def _count_standalone_encounters_for_day(
    *,
    status: str,
    doctor_id,
    clinic_id,
    today: date,
) -> int:
    """Walk-in / EMR-only encounters (no Appointment FK) for a terminal status on a given day."""
    qs = ClinicalEncounter.objects.filter(
        appointment__isnull=True,
        status=status,
        doctor_id=doctor_id,
        clinic_id=clinic_id,
    )
    return encounter_completion_day_window(qs, today, today).count()


def build_doctor_clinic_today_metrics(
    *,
    doctor_id,
    clinic_id,
    today: date,
) -> dict[str, int | str]:
    """
    Derive schedule summary counts for a doctor at a clinic on a given day.

    Terminal counts include appointment rows plus linked or standalone ClinicalEncounter
    rows when the appointment status has not been synced yet.
    """
    qs = Appointment.objects.filter(
        doctor_id=doctor_id,
        clinic_id=clinic_id,
        appointment_date=today,
    )
    counts = status_counts(qs)
    standalone_completed = count_standalone_completed_encounters_for_summary(
        clinic_id=clinic_id,
        doctor_id=doctor_id,
        start_date=today,
        end_date=today,
    )
    standalone_cancelled = _count_standalone_encounters_for_day(
        status="cancelled",
        doctor_id=doctor_id,
        clinic_id=clinic_id,
        today=today,
    )
    standalone_no_show = _count_standalone_encounters_for_day(
        status="no_show",
        doctor_id=doctor_id,
        clinic_id=clinic_id,
        today=today,
    )

    return {
        "date": str(today),
        "scheduled": counts.get("booked", 0),
        "waiting": counts.get("checked_in", 0),
        "completed": counts.get("completed", 0) + standalone_completed,
        "cancelled": counts.get("cancelled", 0) + standalone_cancelled,
        "no_show": counts.get("no_show", 0) + standalone_no_show,
    }

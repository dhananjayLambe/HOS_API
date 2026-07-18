"""
Lightweight orchestration for Patient Summary workspace.

Composes patient identity, operational flags, consultations, prescriptions, and timeline
from existing domain models — no deep serializers or monolithic aggregation endpoints.
"""

from __future__ import annotations

from datetime import timedelta
from typing import Any

from django.db.models import Max, Prefetch
from django.http import Http404
from django.utils import timezone

from consultations_core.models.consultation import Consultation
from consultations_core.models.diagnosis import CustomDiagnosis
from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.models.prescription import Prescription, PrescriptionStatus
from patient_account.models import PatientProfile
from patient_account.services.patient_list_service import (
    OPEN_CONSULTATION_STATUSES,
    OPEN_QUEUE_STATUSES,
    _display_gender,
    _to_age_display,
)

VALID_ENCOUNTER_EXCLUDE = ["cancelled", "no_show"]


def get_accessible_patient_profile_or_404(*, user, patient_profile_id) -> PatientProfile:
    """
    Same access semantics as list_patients_for_workspace:
    active profile + active account; doctors limited to profiles they have encountered.
    """
    qs = PatientProfile.objects.select_related("account__user").filter(
        id=patient_profile_id,
        is_active=True,
        account__is_active=True,
    )
    if user.groups.filter(name="doctor").exists():
        qs = qs.filter(encounters__doctor__user=user)

    profile = qs.distinct().first()
    if profile is None:
        raise Http404("Patient profile not found.")
    return profile


def _format_local_date(dt) -> str:
    if dt is None:
        return ""
    if hasattr(dt, "date"):
        d = timezone.localtime(dt).date() if timezone.is_aware(dt) else dt.date()
    else:
        d = dt
    return d.strftime("%d %b %Y")


def _last_visit_label(last_dt) -> str:
    if last_dt is None:
        return "Never"
    tz_dt = timezone.localtime(last_dt) if timezone.is_aware(last_dt) else last_dt
    d = tz_dt.date()
    today = timezone.localdate()
    if d == today:
        return "Today"
    if d == today - timedelta(days=1):
        return "Yesterday"
    return d.strftime("%d %b %Y")


def _follow_up_date_label(fu_date) -> str:
    if fu_date is None:
        return "None scheduled"
    today = timezone.localdate()
    if fu_date < today:
        return "Overdue"
    if fu_date == today:
        return "Due today"
    if fu_date == today + timedelta(days=1):
        return "Tomorrow"
    return fu_date.strftime("%d %b %Y")


def _medicine_lines_summary(lines) -> str:
    lines = list(lines)
    if not lines:
        return "—"
    first = lines[0].drug_name_snapshot
    if len(lines) == 1:
        return first
    return f"{first} +{len(lines) - 1} more"


def _operational_flags(profile: PatientProfile) -> dict[str, Any]:
    has_queue = ClinicalEncounter.objects.filter(
        patient_profile=profile,
        status__in=OPEN_QUEUE_STATUSES,
    ).exists()
    has_consult = ClinicalEncounter.objects.filter(
        patient_profile=profile,
        status__in=OPEN_CONSULTATION_STATUSES,
    ).exists()
    has_unfinished = Consultation.objects.filter(
        encounter__patient_profile=profile,
        is_finalized=False,
    ).exists()
    today = timezone.localdate()
    is_follow_up_due = Consultation.objects.filter(
        encounter__patient_profile=profile,
        follow_up_date__isnull=False,
        follow_up_date__lte=today,
    ).exists()

    open_state = None
    if has_consult:
        open_state = "consultation_active"
    elif has_queue:
        open_state = "in_queue"

    return {
        "has_open_encounter": bool(has_queue or has_consult),
        "open_encounter_state": open_state,
        "has_unfinished_consultation": has_unfinished,
        "is_follow_up_due": is_follow_up_due,
    }


def build_patient_summary(
    *,
    patient_profile: PatientProfile,
    doctor_id=None,
    clinic_id=None,
) -> dict[str, Any]:
    """
    Compose UI-ready summary dict matching frontend PatientSummaryPayload.

    When doctor_id + clinic_id are provided, lab KPIs and timeline events are
    filled via PatientLabHistoryService (shared WorkspaceReportRepository).
    Never query DiagnosticTestReport directly from this module.
    """
    profile = patient_profile

    enc_valid = ClinicalEncounter.objects.filter(patient_profile=profile).exclude(
        status__in=VALID_ENCOUNTER_EXCLUDE
    )
    visits_count = enc_valid.count()
    agg = enc_valid.aggregate(last_visit=Max("created_at"))
    last_visit_at = agg["last_visit"]

    active_rx_count = Prescription.objects.filter(
        consultation__encounter__patient_profile=profile,
        is_active=True,
        status=PrescriptionStatus.FINALIZED,
    ).count()

    flags = _operational_flags(profile)

    full_name = f"{(profile.first_name or '').strip()} {(profile.last_name or '').strip()}".strip()

    latest_dx_row = (
        CustomDiagnosis.objects.filter(
            consultation__encounter__patient_profile=profile,
            consultation__is_finalized=True,
        )
        .order_by("-created_at")
        .values("name")
        .first()
    )
    last_diagnosis = (latest_dx_row or {}).get("name") or "—"

    rx_prefetch = Prefetch(
        "prescriptions",
        queryset=Prescription.objects.filter(status=PrescriptionStatus.FINALIZED)
        .order_by("-finalized_at", "-version_number")
        .prefetch_related("lines"),
    )

    diag_prefetch = Prefetch(
        "custom_diagnoses",
        queryset=CustomDiagnosis.objects.order_by("-created_at"),
    )

    consultation_qs = (
        Consultation.objects.filter(encounter__patient_profile=profile)
        .select_related("encounter")
        .prefetch_related(diag_prefetch, rx_prefetch)
        .order_by("-started_at")
    )

    consultations_all = list(consultation_qs[:20])
    consultations_payload = []

    for c in consultations_all[:5]:
        dx_list = list(c.custom_diagnoses.all()[:1])
        diagnosis = dx_list[0].name if dx_list else "—"

        rx_list = list(c.prescriptions.all()[:1])
        rx_obj = rx_list[0] if rx_list else None
        med_sum = _medicine_lines_summary(rx_obj.lines.all()) if rx_obj else "—"

        advice = (c.closure_note or "").strip()
        if len(advice) > 200:
            advice = advice[:197] + "…"

        consultations_payload.append(
            {
                "id": str(c.id),
                "date_label": _format_local_date(c.started_at),
                "diagnosis": diagnosis,
                "medicines_summary": med_sum,
                "advice": advice or "—",
                "follow_up": _follow_up_date_label(c.follow_up_date),
            }
        )

    rx_queryset = (
        Prescription.objects.filter(consultation__encounter__patient_profile=profile)
        .exclude(status=PrescriptionStatus.DRAFT)
        .select_related("consultation")
        .prefetch_related("lines")
        .order_by("-finalized_at", "-cancelled_at", "-created_at")
    )
    prescriptions_all = list(rx_queryset[:20])

    prescriptions_payload = []
    for rx in prescriptions_all[:10]:
        if rx.status == PrescriptionStatus.DRAFT:
            continue
        lines = list(rx.lines.all())
        med_summary = _medicine_lines_summary(lines)
        ts = rx.finalized_at or rx.cancelled_at or rx.created_at
        issued = _format_local_date(ts)
        if rx.status == PrescriptionStatus.CANCELLED:
            ui_status = "CANCELLED"
        elif rx.status == PrescriptionStatus.FINALIZED:
            ui_status = "ACTIVE"
        else:
            continue
        prescriptions_payload.append(
            {
                "id": str(rx.id),
                "consultation_id": str(rx.consultation_id),
                "prescription_pnr": rx.prescription_pnr or "",
                "issued_on": issued,
                "medicine_summary": med_summary,
                "status": ui_status,
            }
        )

    latest_active_rx = (
        Prescription.objects.filter(
            consultation__encounter__patient_profile=profile,
            status=PrescriptionStatus.FINALIZED,
            is_active=True,
        )
        .prefetch_related("lines")
        .order_by("-finalized_at")
        .first()
    )
    if latest_active_rx:
        current_meds = _medicine_lines_summary(list(latest_active_rx.lines.all()))
    else:
        current_meds = "—"

    next_fu = (
        Consultation.objects.filter(
            encounter__patient_profile=profile,
            follow_up_date__isnull=False,
        )
        .order_by("follow_up_date")
        .first()
    )
    snapshot_follow_up = _follow_up_date_label(next_fu.follow_up_date) if next_fu else "None scheduled"

    headline, summary = _build_generated_narrative(
        patient_name=full_name or "Patient",
        last_diagnosis=last_diagnosis,
        visits_count=visits_count,
        latest_rx_summary=current_meds if current_meds != "—" else None,
        follow_up_label=snapshot_follow_up,
    )

    timeline_events: list[tuple] = []

    for enc in ClinicalEncounter.objects.filter(patient_profile=profile).exclude(
        status__in=VALID_ENCOUNTER_EXCLUDE
    ).order_by("-created_at")[:25]:
        timeline_events.append(
            (
                enc.created_at,
                f"e-{enc.id}-start",
                "Encounter recorded",
                enc.visit_pnr or "Visit started.",
                "encounter",
                None,
            )
        )

    for c in consultations_all:
        if c.is_finalized and c.ended_at:
            timeline_events.append(
                (
                    c.ended_at,
                    f"c-{c.id}-done",
                    "Consultation completed",
                    "Consultation finalized.",
                    "consultation",
                    None,
                )
            )

    for rx in prescriptions_all:
        if rx.status == PrescriptionStatus.FINALIZED and rx.finalized_at:
            timeline_events.append(
                (
                    rx.finalized_at,
                    f"rx-{rx.id}-fx",
                    "Prescription issued",
                    rx.prescription_pnr or "Prescription finalized.",
                    "prescription",
                    None,
                )
            )
        if rx.status == PrescriptionStatus.CANCELLED and rx.cancelled_at:
            timeline_events.append(
                (
                    rx.cancelled_at,
                    f"rx-{rx.id}-cx",
                    "Prescription cancelled",
                    rx.cancel_reason_code or "Prescription cancelled.",
                    "prescription",
                    None,
                )
            )

    pending_labs = 0
    latest_lab = "No lab data"
    if doctor_id and clinic_id:
        try:
            from datetime import datetime

            from django.utils.dateparse import parse_datetime

            from doctor_report_workspace.services.patient_lab_history import (
                PatientLabHistoryService,
            )

            lab_svc = PatientLabHistoryService()
            lab_summary = lab_svc.get_summary(
                doctor_id=doctor_id,
                clinic_id=clinic_id,
                patient_id=profile.id,
            )
            pending_labs = int(lab_summary.pending or 0)
            if lab_summary.latest_lab:
                if lab_summary.latest_date:
                    latest_lab = f"{lab_summary.latest_lab} · {lab_summary.latest_date}"
                else:
                    latest_lab = lab_summary.latest_lab

            for ev in lab_svc.timeline_events(
                doctor_id=doctor_id,
                clinic_id=clinic_id,
                patient_id=profile.id,
                limit=15,
            ):
                ts = parse_datetime(ev.timestamp) if ev.timestamp else None
                if ts is None and ev.timestamp:
                    try:
                        ts = datetime.fromisoformat(ev.timestamp.replace("Z", "+00:00"))
                    except Exception:
                        ts = timezone.now()
                if ts is None:
                    ts = timezone.now()
                timeline_events.append(
                    (
                        ts,
                        ev.id,
                        ev.event,
                        ev.detail,
                        ev.kind,
                        ev.report_id,
                    )
                )
        except Exception:
            # Lab enrichment must not break the rest of Patient Summary.
            pending_labs = 0
            latest_lab = "No lab data"

    timeline_events.sort(key=lambda x: x[0], reverse=True)
    timeline_payload = []
    for row in timeline_events[:20]:
        ts, eid, title, detail = row[0], row[1], row[2], row[3]
        kind = row[4] if len(row) > 4 else None
        report_id = row[5] if len(row) > 5 else None
        item = {
            "id": eid,
            "date_label": _format_local_date(ts),
            "event": title,
            "detail": detail,
        }
        if kind:
            item["kind"] = kind
        if report_id:
            item["report_id"] = report_id
        timeline_payload.append(item)

    return {
        "patient": {
            "id": str(profile.id),
            "full_name": full_name or "—",
            "first_name": profile.first_name or "",
            "last_name": profile.last_name or "",
            "age_display": _to_age_display(profile),
            "gender": _display_gender(profile.gender),
            "mobile": getattr(profile.account.user, "username", None) or "",
            "uhid": profile.public_id or "",
            **flags,
        },
        "quick_stats": {
            "visits": visits_count,
            "active_rx": active_rx_count,
            "last_visit_label": _last_visit_label(last_visit_at),
            "pending_labs": pending_labs,
        },
        "generated_summary": {
            "headline": headline,
            "summary": summary,
        },
        "snapshot": {
            "last_diagnosis": last_diagnosis,
            "current_medications": current_meds,
            "follow_up": snapshot_follow_up,
            "latest_lab": latest_lab,
        },
        "consultations": consultations_payload,
        "prescriptions": prescriptions_payload,
        "labs": [],
        "timeline": timeline_payload,
    }


def _build_generated_narrative(
    *,
    patient_name: str,
    last_diagnosis: str,
    visits_count: int,
    latest_rx_summary: str | None,
    follow_up_label: str,
) -> tuple[str, str]:
    """Deterministic clinical narrative — not AI-generated."""
    dx = last_diagnosis if last_diagnosis != "—" else "recent complaints"
    headline = "Clinical summary"
    parts = [
        f"{patient_name} has been seen {visits_count} time{'s' if visits_count != 1 else ''} on record.",
        f"The most recent diagnosis documented is {dx}.",
    ]
    if latest_rx_summary and latest_rx_summary != "—":
        parts.append(f"Current medications include {latest_rx_summary}.")
    parts.append(f"Follow-up: {follow_up_label}.")
    summary = " ".join(parts)
    return headline, summary

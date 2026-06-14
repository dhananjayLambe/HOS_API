"""Doctor dashboard patients tab aggregation (no new tables)."""

from __future__ import annotations

from datetime import date, timedelta

from django.core.cache import cache
from django.db.models import Count, Exists, Max, OuterRef, Q

from consultations_core.models.consultation import Consultation
from consultations_core.models.diagnosis import ConsultationDiagnosis, CustomDiagnosis
from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.models.follow_up import FollowUp
from consultations_core.models.prescription import Prescription, PrescriptionStatus
from diagnostics_engine.api.services.doctor_report_counts import count_pending_doctor_reports
from patient_account.models import PatientProfile

CACHE_TTL_SECONDS = 15
ACTIVE_VISIT_DAYS = 30
DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE = 50
ALLOWED_PAGE_SIZES = {5, 10, 25, 50}
FOLLOWUP_WIDGET_LIMIT = 5
EXCLUDED_ENCOUNTER_STATUSES = ["cancelled", "no_show"]
OPEN_QUEUE_STATUSES = ["created", "pre_consultation_in_progress", "pre_consultation_completed"]
OPEN_CONSULTATION_STATUSES = ["consultation_in_progress", "in_consultation"]

STATUS_FOLLOW_UP_DUE = "FOLLOW_UP_DUE"
STATUS_TREATMENT_ONGOING = "TREATMENT_ONGOING"
STATUS_ACTIVE = "ACTIVE"
STATUS_STABLE = "STABLE"


def _normalize_page_size(raw) -> int:
    try:
        value = int(raw or DEFAULT_PAGE_SIZE)
    except (TypeError, ValueError):
        return DEFAULT_PAGE_SIZE
    if value in ALLOWED_PAGE_SIZES:
        return value
    if 1 <= value <= MAX_PAGE_SIZE:
        return value
    return DEFAULT_PAGE_SIZE


def _encounter_scope_filter(*, doctor_id, clinic_id) -> Q:
    return Q(
        encounters__doctor_id=doctor_id,
        encounters__clinic_id=clinic_id,
    ) & ~Q(encounters__status__in=EXCLUDED_ENCOUNTER_STATUSES)


def _scoped_encounter_q(*, doctor_id, clinic_id):
    return ClinicalEncounter.objects.filter(
        doctor_id=doctor_id,
        clinic_id=clinic_id,
    ).exclude(status__in=EXCLUDED_ENCOUNTER_STATUSES)


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


def _collect_treatment_ongoing_patient_ids(*, doctor_id, clinic_id, today: date) -> set:
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


def _collect_followup_due_patient_ids(*, doctor_id, clinic_id, today: date) -> set:
    patient_ids: set = set()

    followup_rows = (
        FollowUp.objects.filter(
            is_completed=False,
            follow_up_date__isnull=False,
            follow_up_date__lte=today,
            consultation__encounter__doctor_id=doctor_id,
            consultation__encounter__clinic_id=clinic_id,
        )
        .exclude(consultation__encounter__status__in=EXCLUDED_ENCOUNTER_STATUSES)
        .values_list("consultation__encounter__patient_profile_id", flat=True)
    )
    patient_ids.update(followup_rows)

    legacy_rows = (
        Consultation.objects.filter(
            follow_up_date__isnull=False,
            follow_up_date__lte=today,
            encounter__doctor_id=doctor_id,
            encounter__clinic_id=clinic_id,
        )
        .exclude(encounter__status__in=EXCLUDED_ENCOUNTER_STATUSES)
        .values_list("encounter__patient_profile_id", flat=True)
    )
    patient_ids.update(legacy_rows)
    return patient_ids


def _compute_patient_status(
    *,
    patient_profile_id,
    last_visit_at,
    today: date,
    followup_due_ids: set,
    treatment_ongoing_ids: set,
) -> str:
    if patient_profile_id in followup_due_ids:
        return STATUS_FOLLOW_UP_DUE
    if patient_profile_id in treatment_ongoing_ids:
        return STATUS_TREATMENT_ONGOING
    if last_visit_at:
        last_visit_date = last_visit_at.date() if hasattr(last_visit_at, "date") else last_visit_at
        if last_visit_date >= today - timedelta(days=ACTIVE_VISIT_DAYS):
            return STATUS_ACTIVE
    return STATUS_STABLE


def _latest_diagnoses_for_profiles(
    *,
    profile_ids,
    doctor_id,
    clinic_id,
) -> dict[str, str]:
    if not profile_ids:
        return {}

    diagnosis_by_profile: dict[str, str] = {}

    dx_rows = (
        ConsultationDiagnosis.objects.filter(
            consultation__encounter__patient_profile_id__in=profile_ids,
            consultation__is_finalized=True,
            is_active=True,
            consultation__encounter__doctor_id=doctor_id,
            consultation__encounter__clinic_id=clinic_id,
        )
        .order_by(
            "consultation__encounter__patient_profile_id",
            "-consultation__ended_at",
            "-is_primary",
            "-created_at",
        )
        .values("consultation__encounter__patient_profile_id", "label", "display_name")
    )
    for item in dx_rows:
        pid = str(item["consultation__encounter__patient_profile_id"])
        if pid not in diagnosis_by_profile:
            diagnosis_by_profile[pid] = item["display_name"] or item["label"] or ""

    missing = [pid for pid in profile_ids if str(pid) not in diagnosis_by_profile]
    if missing:
        custom_rows = (
            CustomDiagnosis.objects.filter(
                consultation__encounter__patient_profile_id__in=missing,
                consultation__is_finalized=True,
                consultation__encounter__doctor_id=doctor_id,
                consultation__encounter__clinic_id=clinic_id,
            )
            .order_by("consultation__encounter__patient_profile_id", "-created_at")
            .values("consultation__encounter__patient_profile_id", "name")
        )
        for item in custom_rows:
            pid = str(item["consultation__encounter__patient_profile_id"])
            if pid not in diagnosis_by_profile:
                diagnosis_by_profile[pid] = item["name"] or ""

    return diagnosis_by_profile


def _last_visit_dates_for_profiles(*, profile_ids, doctor_id, clinic_id) -> dict:
    if not profile_ids:
        return {}

    rows = (
        ClinicalEncounter.objects.filter(
            patient_profile_id__in=profile_ids,
            doctor_id=doctor_id,
            clinic_id=clinic_id,
        )
        .exclude(status__in=EXCLUDED_ENCOUNTER_STATUSES)
        .values("patient_profile_id")
        .annotate(last_visit_at=Max("created_at"))
    )
    return {row["patient_profile_id"]: row["last_visit_at"] for row in rows}


def _build_followup_patients(
    *,
    doctor_id,
    clinic_id,
    today: date,
) -> list[dict]:
    rows: list[dict] = []
    seen_profiles: set = set()

    followups = (
        FollowUp.objects.filter(
            is_completed=False,
            follow_up_date__isnull=False,
            follow_up_date__lte=today,
            consultation__encounter__doctor_id=doctor_id,
            consultation__encounter__clinic_id=clinic_id,
        )
        .exclude(consultation__encounter__status__in=EXCLUDED_ENCOUNTER_STATUSES)
        .select_related(
            "consultation__encounter__patient_profile",
            "consultation__encounter__patient_profile__account__user",
        )
        .order_by("follow_up_date")[:FOLLOWUP_WIDGET_LIMIT]
    )

    followup_items = list(followups)
    legacy_consult_count = max(0, FOLLOWUP_WIDGET_LIMIT - len(followup_items))
    legacy_consults_preview: list[Consultation] = []
    if legacy_consult_count:
        exclude_ids = [
            f.consultation.encounter.patient_profile_id
            for f in followup_items
            if f.consultation.encounter.patient_profile_id
        ]
        legacy_consults_preview = list(
            Consultation.objects.filter(
                follow_up_date__isnull=False,
                follow_up_date__lte=today,
                encounter__doctor_id=doctor_id,
                encounter__clinic_id=clinic_id,
            )
            .exclude(encounter__status__in=EXCLUDED_ENCOUNTER_STATUSES)
            .exclude(encounter__patient_profile_id__in=exclude_ids)
            .select_related("encounter__patient_profile", "encounter__patient_profile__account__user")
            .order_by("follow_up_date")[:legacy_consult_count]
        )

    profile_ids_for_visits = [
        pid
        for pid in (
            *[f.consultation.encounter.patient_profile_id for f in followup_items],
            *[c.encounter.patient_profile_id for c in legacy_consults_preview],
        )
        if pid
    ]
    last_visit_by_profile = _last_visit_dates_for_profiles(
        profile_ids=profile_ids_for_visits,
        doctor_id=doctor_id,
        clinic_id=clinic_id,
    )

    for followup in followup_items:
        profile = followup.consultation.encounter.patient_profile
        if not profile or profile.id in seen_profiles:
            continue
        seen_profiles.add(profile.id)
        full_name = f"{(profile.first_name or '').strip()} {(profile.last_name or '').strip()}".strip()
        last_visit_at = last_visit_by_profile.get(profile.id)
        last_visit_days = 0
        if last_visit_at:
            last_visit_date = last_visit_at.date() if hasattr(last_visit_at, "date") else last_visit_at
            last_visit_days = max(0, (today - last_visit_date).days)
        followup_date = followup.follow_up_date
        days_overdue = max(0, (today - followup_date).days) if followup_date else 0
        rows.append(
            {
                "patient_id": str(profile.id),
                "patient_name": full_name,
                "last_visit_days": last_visit_days,
                "days_overdue": days_overdue,
                "followup_date": followup_date.isoformat() if followup_date else None,
            }
        )

    if len(rows) < FOLLOWUP_WIDGET_LIMIT:
        for consultation in legacy_consults_preview:
            if len(rows) >= FOLLOWUP_WIDGET_LIMIT:
                break
            profile = consultation.encounter.patient_profile
            if not profile or profile.id in seen_profiles:
                continue
            seen_profiles.add(profile.id)
            full_name = f"{(profile.first_name or '').strip()} {(profile.last_name or '').strip()}".strip()
            last_visit_at = last_visit_by_profile.get(profile.id)
            last_visit_days = 0
            if last_visit_at:
                last_visit_date = last_visit_at.date() if hasattr(last_visit_at, "date") else last_visit_at
                last_visit_days = max(0, (today - last_visit_date).days)
            followup_date = consultation.follow_up_date
            days_overdue = max(0, (today - followup_date).days) if followup_date else 0
            rows.append(
                {
                    "patient_id": str(profile.id),
                    "patient_name": full_name,
                    "last_visit_days": last_visit_days,
                    "days_overdue": days_overdue,
                    "followup_date": followup_date.isoformat() if followup_date else None,
                }
            )

    return rows


def _build_insights(*, doctor_id, clinic_id, today: date, followup_due_ids: set, treatment_ongoing_ids: set) -> dict:
    scoped = _scoped_encounter_q(doctor_id=doctor_id, clinic_id=clinic_id)
    patients_seen_today = (
        scoped.filter(
            status="consultation_completed",
            created_at__date=today,
        )
        .values("patient_profile_id")
        .distinct()
        .count()
    )
    return {
        "patients_seen_today": patients_seen_today,
        "followup_due": len(followup_due_ids),
        "treatment_ongoing": len(treatment_ongoing_ids),
        "pending_reports": count_pending_doctor_reports(doctor_id=doctor_id, clinic_id=clinic_id),
    }


def build_doctor_patients_dashboard(
    *,
    doctor_id,
    clinic_id,
    page: int = 1,
    page_size: int = DEFAULT_PAGE_SIZE,
    use_cache: bool = True,
) -> dict:
    page = max(int(page or 1), 1)
    page_size = _normalize_page_size(page_size)
    cache_key = f"doctor_patients_dashboard:{doctor_id}:{clinic_id}:{page}:{page_size}"

    if use_cache:
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

    today = date.today()
    encounter_filter = Q(
        encounters__doctor_id=doctor_id,
        encounters__clinic_id=clinic_id,
    ) & ~Q(encounters__status__in=EXCLUDED_ENCOUNTER_STATUSES)

    queue_encounter_exists = ClinicalEncounter.objects.filter(
        patient_profile_id=OuterRef("id"),
        doctor_id=doctor_id,
        clinic_id=clinic_id,
        status__in=OPEN_QUEUE_STATUSES,
    )
    consult_encounter_exists = ClinicalEncounter.objects.filter(
        patient_profile_id=OuterRef("id"),
        doctor_id=doctor_id,
        clinic_id=clinic_id,
        status__in=OPEN_CONSULTATION_STATUSES,
    )
    unfinished_consult_exists = Consultation.objects.filter(
        encounter__patient_profile_id=OuterRef("id"),
        encounter__doctor_id=doctor_id,
        encounter__clinic_id=clinic_id,
        is_finalized=False,
    )

    base = (
        PatientProfile.objects.select_related("account__user")
        .filter(is_active=True, account__is_active=True)
        .filter(_encounter_scope_filter(doctor_id=doctor_id, clinic_id=clinic_id))
        .annotate(
            last_visit_at=Max("encounters__created_at", filter=encounter_filter),
            total_visits=Count(
                "encounters",
                filter=encounter_filter,
                distinct=True,
            ),
            has_queue_encounter=Exists(queue_encounter_exists),
            has_consultation_encounter=Exists(consult_encounter_exists),
            has_unfinished_consultation=Exists(unfinished_consult_exists),
        )
        .order_by("-last_visit_at", "first_name", "last_name")
        .distinct()
    )

    total_count = base.count()
    start = (page - 1) * page_size
    page_rows = list(base[start : start + page_size])

    followup_due_ids = _collect_followup_due_patient_ids(
        doctor_id=doctor_id,
        clinic_id=clinic_id,
        today=today,
    )
    treatment_ongoing_ids = _collect_treatment_ongoing_patient_ids(
        doctor_id=doctor_id,
        clinic_id=clinic_id,
        today=today,
    )

    profile_ids = [row.id for row in page_rows]
    diagnosis_map = _latest_diagnoses_for_profiles(
        profile_ids=profile_ids,
        doctor_id=doctor_id,
        clinic_id=clinic_id,
    )

    recent_results = []
    for profile in page_rows:
        full_name = f"{(profile.first_name or '').strip()} {(profile.last_name or '').strip()}".strip()
        last_visit_at = profile.last_visit_at
        last_visit_date = None
        if last_visit_at:
            last_visit_date = (
                last_visit_at.date().isoformat()
                if hasattr(last_visit_at, "date")
                else str(last_visit_at)
            )
        status = _compute_patient_status(
            patient_profile_id=profile.id,
            last_visit_at=last_visit_at,
            today=today,
            followup_due_ids=followup_due_ids,
            treatment_ongoing_ids=treatment_ongoing_ids,
        )
        recent_results.append(
            {
                "patient_id": str(profile.id),
                "patient_name": full_name,
                "mobile": getattr(profile.account.user, "username", None),
                "last_visit_date": last_visit_date,
                "total_visits": profile.total_visits or 0,
                "diagnosis": diagnosis_map.get(str(profile.id), ""),
                "status": status,
                "risk_level": "LOW",
                "has_open_encounter": bool(
                    profile.has_queue_encounter or profile.has_consultation_encounter
                ),
                "open_encounter_state": (
                    "consultation_active"
                    if profile.has_consultation_encounter
                    else "in_queue"
                    if profile.has_queue_encounter
                    else None
                ),
                "has_unfinished_consultation": bool(profile.has_unfinished_consultation),
            }
        )

    payload = {
        "insights": _build_insights(
            doctor_id=doctor_id,
            clinic_id=clinic_id,
            today=today,
            followup_due_ids=followup_due_ids,
            treatment_ongoing_ids=treatment_ongoing_ids,
        ),
        "recent_patients": {
            "count": total_count,
            "results": recent_results,
        },
        "followup_patients": _build_followup_patients(
            doctor_id=doctor_id,
            clinic_id=clinic_id,
            today=today,
        ),
    }

    if use_cache:
        cache.set(cache_key, payload, timeout=CACHE_TTL_SECONDS)

    return payload

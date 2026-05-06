import re
from datetime import date

from django.db.models import Count, Exists, Max, OuterRef, Q

from consultations_core.models.diagnosis import CustomDiagnosis
from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.models.consultation import Consultation
from consultations_core.models.prescription import PrescriptionStatus
from patient_account.models import PatientProfile

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 50
DEFAULT_FILTER = "recent"
ALLOWED_FILTERS = {"recent", "today", "follow_up_due", "has_active_rx"}
OPEN_QUEUE_STATUSES = ["created", "pre_consultation_in_progress", "pre_consultation_completed"]
OPEN_CONSULTATION_STATUSES = ["consultation_in_progress", "in_consultation"]
OPEN_STATUSES = OPEN_QUEUE_STATUSES + OPEN_CONSULTATION_STATUSES


def _normalize_query(raw_query: str) -> str:
    cleaned = re.sub(r"[^\w\s@+()-]", " ", raw_query or "")
    return " ".join(cleaned.split())[:50]


def _to_age_display(profile: PatientProfile) -> str:
    if profile.age_years is not None:
        return f"{profile.age_years}Y"
    if profile.date_of_birth:
        today = date.today()
        years = today.year - profile.date_of_birth.year
        if (today.month, today.day) < (profile.date_of_birth.month, profile.date_of_birth.day):
            years -= 1
        return f"{years}Y"
    return "N/A"


def _display_gender(raw_gender: str) -> str:
    if not raw_gender:
        return "N/A"
    normalized = raw_gender.strip().lower()
    if normalized == "male":
        return "Male"
    if normalized == "female":
        return "Female"
    if normalized == "other":
        return "Other"
    return raw_gender


def list_patients_for_workspace(
    *,
    user,
    query: str = "",
    filter_key: str = DEFAULT_FILTER,
    page: int = 1,
    page_size: int = DEFAULT_PAGE_SIZE,
):
    effective_filter = filter_key if filter_key in ALLOWED_FILTERS else DEFAULT_FILTER
    page = max(int(page or 1), 1)
    page_size = min(max(int(page_size or DEFAULT_PAGE_SIZE), 1), MAX_PAGE_SIZE)

    normalized_query = _normalize_query(query)
    query_tokens = [token for token in normalized_query.split(" ") if token]
    digit_query = "".join(ch for ch in normalized_query if ch.isdigit())

    base = PatientProfile.objects.select_related("account__user").filter(
        is_active=True,
        account__is_active=True,
    )

    if user.groups.filter(name="doctor").exists():
        base = base.filter(encounters__doctor__user=user)

    if query_tokens or digit_query:
        name_filter = Q()
        for token in query_tokens:
            name_filter &= (
                Q(first_name__icontains=token)
                | Q(last_name__icontains=token)
                | Q(public_id__icontains=token)
            )

        pnr_mobile_filter = Q()
        if digit_query:
            pnr_mobile_filter = (
                Q(account__user__username__icontains=digit_query)
                | Q(encounters__visit_pnr__icontains=digit_query)
            )

        combined = name_filter
        if pnr_mobile_filter:
            combined = (name_filter | pnr_mobile_filter) if query_tokens else pnr_mobile_filter
        base = base.filter(combined)

    valid_encounters = ~Q(encounters__status__in=["cancelled", "no_show"])
    queue_encounter_exists = ClinicalEncounter.objects.filter(
        patient_profile_id=OuterRef("id"),
        status__in=OPEN_QUEUE_STATUSES,
    )
    consult_encounter_exists = ClinicalEncounter.objects.filter(
        patient_profile_id=OuterRef("id"),
        status__in=OPEN_CONSULTATION_STATUSES,
    )
    unfinished_consult_exists = Consultation.objects.filter(
        encounter__patient_profile_id=OuterRef("id"),
        is_finalized=False,
    )
    due_followup_exists = Consultation.objects.filter(
        encounter__patient_profile_id=OuterRef("id"),
        follow_up_date__isnull=False,
        follow_up_date__lte=date.today(),
    )

    base = base.annotate(
        last_visit_at=Max("encounters__created_at", filter=valid_encounters),
        visits_count=Count("encounters", filter=valid_encounters, distinct=True),
        active_prescriptions_count=Count(
            "encounters__consultation__prescriptions",
            filter=Q(
                encounters__consultation__prescriptions__is_active=True,
                encounters__consultation__prescriptions__status=PrescriptionStatus.FINALIZED,
            ),
            distinct=True,
        ),
        has_queue_encounter=Exists(queue_encounter_exists),
        has_consultation_encounter=Exists(consult_encounter_exists),
        has_unfinished_consultation=Exists(unfinished_consult_exists),
        is_follow_up_due=Exists(due_followup_exists),
    )

    today = date.today()
    if effective_filter == "today":
        today_encounter = ClinicalEncounter.objects.filter(
            patient_profile_id=OuterRef("id"),
            created_at__date=today,
        ).exclude(status__in=["cancelled", "no_show"])
        base = base.annotate(has_today=Exists(today_encounter)).filter(has_today=True)
    elif effective_filter == "follow_up_due":
        due_consultation = ClinicalEncounter.objects.filter(
            patient_profile_id=OuterRef("id"),
            consultation__follow_up_date__isnull=False,
            consultation__follow_up_date__lte=today,
        ).exclude(status__in=["cancelled", "no_show"])
        base = base.annotate(has_due_followup=Exists(due_consultation)).filter(has_due_followup=True)
    elif effective_filter == "has_active_rx":
        base = base.filter(active_prescriptions_count__gt=0)

    base = base.order_by("-last_visit_at", "first_name", "last_name").distinct()
    total = base.count()

    start = (page - 1) * page_size
    end = start + page_size
    rows = list(base[start:end])
    profile_ids = [row.id for row in rows]

    latest_dx = {}
    if profile_ids:
        diagnosis_rows = (
            CustomDiagnosis.objects.filter(
                consultation__encounter__patient_profile_id__in=profile_ids,
                consultation__is_finalized=True,
            )
            .order_by("consultation__encounter__patient_profile_id", "-created_at")
            .values("consultation__encounter__patient_profile_id", "name")
        )
        for item in diagnosis_rows:
            pid = str(item["consultation__encounter__patient_profile_id"])
            if pid not in latest_dx:
                latest_dx[pid] = item["name"]

    payload = []
    for profile in rows:
        full_name = f"{(profile.first_name or '').strip()} {(profile.last_name or '').strip()}".strip()
        payload.append(
            {
                "patient_id": str(profile.id),
                "patient_account_id": str(profile.account_id),
                "uhid": profile.public_id or "",
                "full_name": full_name,
                "first_name": profile.first_name or "",
                "last_name": profile.last_name or "",
                "age_display": _to_age_display(profile),
                "gender": _display_gender(profile.gender),
                "mobile": getattr(profile.account.user, "username", None),
                "last_visit_at": profile.last_visit_at.isoformat() if profile.last_visit_at else None,
                "recent_diagnosis": latest_dx.get(str(profile.id), ""),
                "active_prescriptions_count": profile.active_prescriptions_count or 0,
                "visits_count": profile.visits_count or 0,
                "has_open_encounter": bool(profile.has_queue_encounter or profile.has_consultation_encounter),
                "open_encounter_state": (
                    "consultation_active"
                    if profile.has_consultation_encounter
                    else "in_queue"
                    if profile.has_queue_encounter
                    else None
                ),
                "has_unfinished_consultation": bool(profile.has_unfinished_consultation),
                "is_follow_up_due": bool(profile.is_follow_up_due),
            }
        )

    total_pages = (total + page_size - 1) // page_size if total else 0
    return {
        "results": payload,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
        "filter": effective_filter,
    }

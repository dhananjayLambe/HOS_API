"""Query and filter clinical encounters for the helpdesk Visits dashboard."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date, timedelta

from django.db.models import CharField, Count, Exists, OuterRef, Q
from django.db.models.functions import Cast, Coalesce, TruncDate
from django.utils import timezone

from consultations_core.domain.encounter_status import normalize_encounter_status
from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.models.prescription import Prescription, PrescriptionStatus


VISIT_TYPE_API_TO_DB: dict[str, str] = {
    "WALK_IN": "walk_in",
    "APPOINTMENT": "appointment",
    "FOLLOW_UP": "follow_up",
    "EMERGENCY": "emergency",
}

STATUS_API_TO_DB: dict[str, tuple[str, ...]] = {
    "IN_PROGRESS": ("consultation_in_progress", "in_consultation"),
    "COMPLETED": ("consultation_completed", "completed"),
    "CLOSED": ("closed",),
    "CANCELLED": ("cancelled",),
    "NO_SHOW": ("no_show",),
}

TERMINAL_EXCLUDED_STATUSES = ("cancelled", "no_show")

_ORDERING_WHITELIST = frozenset(
    {
        "started_at",
        "-started_at",
        "visit_pnr",
        "-visit_pnr",
        "created_at",
        "-created_at",
    },
)


@dataclass(frozen=True)
class ClinicalVisitsListParams:
    search: str = ""
    from_date: date | None = None
    to_date: date | None = None
    doctor_id: str = ""
    visit_type: str = ""
    status: str = ""
    ordering: str = "-started_at"
    page: int = 1
    page_size: int = 25


def resolve_clinic_ids_for_user(user) -> list | None:
    """
    Return clinic id list for helpdesk scoping, or None for unrestricted (superuser).
    Empty list means no clinic assignment.
    """
    if user.is_superuser:
        return None
    hp = getattr(user, "helpdesk_profile", None)
    if hp is None:
        return []
    return [hp.clinic_id]


def default_date_range() -> tuple[date, date]:
    today = timezone.localdate()
    return today - timedelta(days=6), today


def normalize_search_query(search: str) -> tuple[str, str]:
    stripped = (search or "").strip()
    if not stripped:
        return "", ""
    phone_normalized = re.sub(r"[\s+\-()]", "", stripped)
    return stripped, phone_normalized


def base_encounters_queryset(*, clinic_ids: list | None):
    qs = (
        ClinicalEncounter.objects.filter(check_in_time__isnull=False)
        .exclude(status__in=TERMINAL_EXCLUDED_STATUSES)
        .select_related(
            "doctor",
            "doctor__user",
            "patient_profile",
            "patient_profile__account",
            "patient_profile__account__user",
            "clinic",
            "consultation",
        )
        .annotate(
            _started_at=Coalesce("check_in_time", "created_at"),
            tests_count=Count(
                "consultation__investigations__items",
                filter=Q(consultation__investigations__items__is_deleted=False),
                distinct=True,
            ),
            reports_count=Count(
                "diagnostic_orders__test_lines__test_reports",
                distinct=True,
            ),
            has_prescription=Exists(
                Prescription.objects.filter(
                    consultation__encounter_id=OuterRef("pk"),
                    is_active=True,
                    status=PrescriptionStatus.FINALIZED,
                ),
            ),
        )
    )
    if clinic_ids is not None:
        if not clinic_ids:
            return qs.none()
        qs = qs.filter(clinic_id__in=clinic_ids)
    return qs


def _statuses_for_api_filter(status: str) -> tuple[str, ...] | None:
    key = (status or "").strip().upper()
    if not key:
        return None
    if key in STATUS_API_TO_DB:
        return STATUS_API_TO_DB[key]
    normalized = normalize_encounter_status(key.lower())
    return (normalized,)


def _visit_type_for_api_filter(visit_type: str) -> str | None:
    key = (visit_type or "").strip().upper()
    if not key:
        return None
    return VISIT_TYPE_API_TO_DB.get(key)


def apply_list_filters(qs, params: ClinicalVisitsListParams):
    date_from = params.from_date
    date_to = params.to_date
    if not date_from and not date_to:
        date_from, date_to = default_date_range()

    if date_from:
        qs = qs.annotate(_visit_day=TruncDate(Coalesce("check_in_time", "created_at"))).filter(
            _visit_day__gte=date_from,
        )
    if date_to:
        if "_visit_day" not in qs.query.annotations:
            qs = qs.annotate(_visit_day=TruncDate(Coalesce("check_in_time", "created_at")))
        qs = qs.filter(_visit_day__lte=date_to)

    statuses = _statuses_for_api_filter(params.status)
    if statuses:
        qs = qs.filter(status__in=statuses)

    visit_type = _visit_type_for_api_filter(params.visit_type)
    if visit_type:
        qs = qs.filter(encounter_type=visit_type)

    if params.doctor_id:
        qs = qs.filter(doctor_id=params.doctor_id)

    search, phone_q = normalize_search_query(params.search)
    if search:
        search_q = (
            Q(visit_pnr__icontains=search)
            | Q(patient_profile__first_name__icontains=search)
            | Q(patient_profile__last_name__icontains=search)
            | Q(patient_profile__public_id__icontains=search)
            | Q(patient_profile__account__user__username__icontains=search)
        )
        search_q |= Q(_encounter_id_str__icontains=search.replace("-", ""))
        if phone_q and phone_q != search:
            search_q |= Q(patient_profile__account__user__username__icontains=phone_q)
        qs = qs.annotate(_encounter_id_str=Cast("id", CharField())).filter(search_q).distinct()

    return qs


def apply_ordering(qs, params: ClinicalVisitsListParams):
    ordering = params.ordering if params.ordering in _ORDERING_WHITELIST else "-started_at"
    if "_started_at" not in qs.query.annotations:
        qs = qs.annotate(_started_at=Coalesce("check_in_time", "created_at"))
    if ordering in ("started_at", "-started_at"):
        secondary = "-visit_pnr" if ordering == "-started_at" else "visit_pnr"
        return qs.order_by(ordering.replace("started_at", "_started_at"), secondary)
    if ordering in ("created_at", "-created_at"):
        return qs.order_by(ordering, "-visit_pnr")
    return qs.order_by(ordering)


def parse_list_params(query_params) -> ClinicalVisitsListParams:
    def parse_date(value: str | None) -> date | None:
        if not value:
            return None
        try:
            return date.fromisoformat(str(value).strip()[:10])
        except ValueError:
            return None

    ordering = (query_params.get("ordering") or "-started_at").strip()
    if ordering not in _ORDERING_WHITELIST:
        ordering = "-started_at"

    try:
        page = max(1, int(query_params.get("page") or 1))
    except (TypeError, ValueError):
        page = 1
    try:
        page_size = max(1, min(100, int(query_params.get("page_size") or 25)))
    except (TypeError, ValueError):
        page_size = 25

    search = (query_params.get("search") or query_params.get("q") or "").strip()

    return ClinicalVisitsListParams(
        search=search,
        from_date=parse_date(query_params.get("from_date")),
        to_date=parse_date(query_params.get("to_date")),
        doctor_id=(query_params.get("doctor_id") or "").strip(),
        visit_type=(query_params.get("visit_type") or "").strip(),
        status=(query_params.get("status") or "").strip(),
        ordering=ordering,
        page=page,
        page_size=page_size,
    )


def encounter_in_user_scope(encounter: ClinicalEncounter, clinic_ids: list | None) -> bool:
    if clinic_ids is None:
        return True
    return encounter.clinic_id in clinic_ids


def build_dashboard_summary(*, clinic_ids: list | None) -> dict[str, int]:
    today = timezone.localdate()
    base = base_encounters_queryset(clinic_ids=clinic_ids).annotate(
        _visit_day=TruncDate(Coalesce("check_in_time", "created_at")),
    )
    today_qs = base.filter(_visit_day=today)
    completed_statuses = STATUS_API_TO_DB["COMPLETED"]

    from consultations_core.models.follow_up import FollowUp

    followups = FollowUp.objects.filter(
        follow_up_date=today,
        consultation__encounter__check_in_time__isnull=False,
    ).exclude(consultation__encounter__status__in=TERMINAL_EXCLUDED_STATUSES)
    if clinic_ids is not None:
        if not clinic_ids:
            followups = followups.none()
        else:
            followups = followups.filter(consultation__encounter__clinic_id__in=clinic_ids)

    return {
        "today_visits": today_qs.count(),
        "completed_visits": today_qs.filter(status__in=completed_statuses).count(),
        "followups": followups.count(),
    }

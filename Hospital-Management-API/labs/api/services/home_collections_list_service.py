"""Query and filter home collection requests for the dashboard API."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta

from django.db.models import Prefetch, Q
from django.utils import timezone

from diagnostics_engine.models.orders import DiagnosticOrderTestLine
from labs.api.services.home_collections_presenter import (
    HomeCollectionListRowDTO,
    build_home_collection_row_dto,
)
from labs.choices.workflow import CollectionStatus, LabAssignmentStatus
from labs.models import LabCollectionRequest, LabUser

_TAB_STATUS_MAP = {
    "pending": CollectionStatus.PENDING,
    "assigned": CollectionStatus.ASSIGNED,
    "active": CollectionStatus.IN_PROGRESS,
    "collected": CollectionStatus.COLLECTED,
    "failed": CollectionStatus.FAILED,
}


@dataclass(frozen=True)
class HomeCollectionsListParams:
    q: str = ""
    status_tab: str = ""
    date_preset: str = ""
    date_from: date | None = None
    date_to: date | None = None
    ordering: str = "-preferred_date"


def base_collections_queryset(lab_user: LabUser):
    return (
        LabCollectionRequest.objects.filter(
            lab_branch_id=lab_user.branch_id,
            is_deleted=False,
            diagnostic_order__lab_assignment__status__in=[
                LabAssignmentStatus.ACCEPTED,
                LabAssignmentStatus.IN_PROGRESS,
            ],
        )
        .select_related(
            "diagnostic_order",
            "diagnostic_order__patient_profile",
            "diagnostic_order__patient_profile__account__user",
            "diagnostic_order__lab_assignment",
            "assigned_phlebotomist",
            "assigned_phlebotomist__user",
        )
        .prefetch_related(
            Prefetch(
                "diagnostic_order__test_lines",
                queryset=DiagnosticOrderTestLine.objects.select_related("service"),
            ),
        )
    )


def apply_list_filters(qs, params: HomeCollectionsListParams):
    tab = (params.status_tab or "").strip().lower()
    if tab and tab in _TAB_STATUS_MAP:
        qs = qs.filter(collection_status=_TAB_STATUS_MAP[tab])

    if params.date_from:
        qs = qs.filter(preferred_date__gte=params.date_from)
    if params.date_to:
        qs = qs.filter(preferred_date__lte=params.date_to)

    q = (params.q or "").strip()
    if q:
        qs = qs.filter(
            Q(diagnostic_order__order_number__icontains=q)
            | Q(diagnostic_order__patient_profile__first_name__icontains=q)
            | Q(diagnostic_order__patient_profile__last_name__icontains=q)
            | Q(diagnostic_order__patient_profile__account__user__username__icontains=q)
        )

    if params.ordering == "preferred_date":
        return qs.order_by("preferred_date", "-created_at")
    return qs.order_by("-preferred_date", "-created_at")


def parse_list_params(query_params) -> HomeCollectionsListParams:
    date_from, date_to = _date_range_from_preset(query_params.get("date_preset"))
    explicit_from = _parse_date_param(query_params.get("date_from"))
    explicit_to = _parse_date_param(query_params.get("date_to"))
    if explicit_from:
        date_from = explicit_from
    if explicit_to:
        date_to = explicit_to

    ordering = (query_params.get("ordering") or "-preferred_date").strip()
    if ordering not in ("-preferred_date", "preferred_date"):
        ordering = "-preferred_date"

    return HomeCollectionsListParams(
        q=(query_params.get("q") or "").strip(),
        status_tab=(query_params.get("status") or "").strip().lower(),
        date_preset=(query_params.get("date_preset") or "").strip().lower(),
        date_from=date_from,
        date_to=date_to,
        ordering=ordering,
    )


def build_row_dtos(collections) -> list[HomeCollectionListRowDTO]:
    return [build_home_collection_row_dto(c) for c in collections]


def build_summary_counts(lab_user: LabUser, *, date_preset: str = "") -> dict[str, int]:
    today = timezone.localdate()
    date_from, date_to = _date_range_from_preset(date_preset)
    if not date_from:
        date_from = today
        date_to = today

    base = LabCollectionRequest.objects.filter(
        lab_branch_id=lab_user.branch_id,
        is_deleted=False,
        diagnostic_order__lab_assignment__status__in=[
            LabAssignmentStatus.ACCEPTED,
            LabAssignmentStatus.IN_PROGRESS,
        ],
    )

    on_date = base.filter(preferred_date__gte=date_from, preferred_date__lte=date_to)

    return {
        "pending_collections": base.filter(collection_status=CollectionStatus.PENDING).count(),
        "assigned_today": on_date.filter(
            collection_status=CollectionStatus.ASSIGNED,
            assigned_at__date=today,
        ).count()
        + on_date.filter(
            collection_status=CollectionStatus.ASSIGNED,
            assigned_at__isnull=True,
            preferred_date=today,
        ).count(),
        "active_collections": base.filter(
            collection_status=CollectionStatus.IN_PROGRESS,
        ).count(),
        "collected_today": base.filter(
            collection_status=CollectionStatus.COLLECTED,
            collected_at__date=today,
        ).count(),
        "failed_no_response": on_date.filter(
            collection_status=CollectionStatus.FAILED,
        ).count(),
    }


def _date_range_from_preset(preset: str | None) -> tuple[date | None, date | None]:
    if not preset:
        return None, None
    today = timezone.localdate()
    preset = preset.strip().lower()
    if preset == "today":
        return today, today
    if preset == "tomorrow":
        t = today + timedelta(days=1)
        return t, t
    if preset in ("week", "this_week"):
        start = today - timedelta(days=today.weekday())
        return start, start + timedelta(days=6)
    return None, None


def _parse_date_param(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def _start_of_day(day: date) -> datetime:
    tz = timezone.get_current_timezone()
    return timezone.make_aware(datetime.combine(day, time.min), tz)


def _end_of_day(day: date) -> datetime:
    tz = timezone.get_current_timezone()
    return timezone.make_aware(datetime.combine(day, time.max), tz)

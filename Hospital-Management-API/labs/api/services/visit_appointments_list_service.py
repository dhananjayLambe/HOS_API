"""Query and filter visit appointments for the dashboard API."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date

from django.db.models import CharField, Prefetch, Q
from django.db.models.functions import Cast
from django.utils import timezone

from diagnostics_engine.models.orders import DiagnosticOrderTestLine
from labs.api.services.shared_date_presets import date_range_from_preset, parse_date_param
from labs.api.services.visit_appointments_presenter import (
    VisitAppointmentListRowDTO,
    build_visit_appointment_row_dto,
)
from labs.choices.workflow import AppointmentStatus, LabAssignmentStatus
from labs.models import LabUser, LabVisitAppointment

_STATUS_TAB_MAP: dict[str, tuple[str, ...]] = {
    "scheduled": (AppointmentStatus.PENDING, AppointmentStatus.RESCHEDULED),
    "confirmed": (AppointmentStatus.CONFIRMED,),
    "checked_in": (AppointmentStatus.CHECKED_IN,),
    "completed": (AppointmentStatus.COMPLETED,),
    "failed": (AppointmentStatus.NO_SHOW, AppointmentStatus.CANCELLED),
}

_RAW_STATUS_VALUES = frozenset(
    {
        AppointmentStatus.PENDING,
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.CHECKED_IN,
        AppointmentStatus.COMPLETED,
        AppointmentStatus.NO_SHOW,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.RESCHEDULED,
    },
)

_ORDERING_WHITELIST = frozenset(
    {
        "appointment_date",
        "-appointment_date",
        "created_at",
        "-created_at",
    },
)


@dataclass(frozen=True)
class VisitAppointmentsListParams:
    status: str = ""
    q: str = ""
    date_preset: str = ""
    date_from: date | None = None
    date_to: date | None = None
    ordering: str = "-appointment_date"
    page: int = 1
    page_size: int = 20


def normalize_search_query(q: str) -> tuple[str, str]:
    """Return (display_query, phone_normalized) for search filters."""
    stripped = (q or "").strip()
    if not stripped:
        return "", ""
    phone_normalized = re.sub(r"[\s+\-()]", "", stripped)
    return stripped, phone_normalized


def base_visit_queryset(lab_user: LabUser):
    return (
        LabVisitAppointment.objects.filter(
            lab_branch_id=lab_user.branch_id,
            is_deleted=False,
            appointment_date__isnull=False,
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
            "lab_branch",
        )
        .prefetch_related(
            Prefetch(
                "diagnostic_order__test_lines",
                queryset=DiagnosticOrderTestLine.objects.select_related("service"),
            ),
        )
    )


def _statuses_for_tab(tab: str) -> tuple[str, ...] | None:
    tab = (tab or "").strip().lower()
    if not tab:
        return None
    if tab in _STATUS_TAB_MAP:
        return _STATUS_TAB_MAP[tab]
    upper = tab.upper()
    if upper in _RAW_STATUS_VALUES:
        return (upper,)
    return None


def apply_list_filters(qs, params: VisitAppointmentsListParams):
    statuses = _statuses_for_tab(params.status)
    if statuses:
        qs = qs.filter(status__in=statuses)

    if params.date_from:
        qs = qs.filter(appointment_date__gte=params.date_from)
    if params.date_to:
        qs = qs.filter(appointment_date__lte=params.date_to)

    q, phone_q = normalize_search_query(params.q)
    if q:
        search_q = (
            Q(diagnostic_order__order_number__icontains=q)
            | Q(diagnostic_order__patient_profile__first_name__icontains=q)
            | Q(diagnostic_order__patient_profile__last_name__icontains=q)
            | Q(diagnostic_order__patient_profile__account__user__username__icontains=q)
        )
        search_q |= Q(_visit_id_str__icontains=q.replace("-", ""))
        if phone_q and phone_q != q:
            search_q |= Q(
                diagnostic_order__patient_profile__account__user__username__icontains=phone_q,
            )
        qs = qs.annotate(_visit_id_str=Cast("id", CharField())).filter(search_q).distinct()

    return qs


def apply_ordering(qs, params: VisitAppointmentsListParams):
    ordering = params.ordering if params.ordering in _ORDERING_WHITELIST else "-appointment_date"
    if ordering == "appointment_date":
        return qs.order_by("appointment_date", "-created_at", "-id")
    if ordering == "-appointment_date":
        return qs.order_by("-appointment_date", "-created_at", "-id")
    if ordering == "created_at":
        return qs.order_by("created_at", "-id")
    return qs.order_by("-created_at", "-id")


def parse_list_params(query_params) -> VisitAppointmentsListParams:
    date_from, date_to = date_range_from_preset(query_params.get("date_preset"))
    explicit_from = parse_date_param(query_params.get("date_from"))
    explicit_to = parse_date_param(query_params.get("date_to"))
    if explicit_from:
        date_from = explicit_from
    if explicit_to:
        date_to = explicit_to

    ordering = (query_params.get("ordering") or "-appointment_date").strip()
    if ordering not in _ORDERING_WHITELIST:
        ordering = "-appointment_date"

    try:
        page = max(1, int(query_params.get("page") or 1))
    except (TypeError, ValueError):
        page = 1
    try:
        page_size = max(1, min(50, int(query_params.get("page_size") or 20)))
    except (TypeError, ValueError):
        page_size = 20

    return VisitAppointmentsListParams(
        status=(query_params.get("status") or "").strip(),
        q=(query_params.get("q") or "").strip(),
        date_preset=(query_params.get("date_preset") or "").strip().lower(),
        date_from=date_from,
        date_to=date_to,
        ordering=ordering,
        page=page,
        page_size=page_size,
    )


def build_row_dtos(visits) -> list[VisitAppointmentListRowDTO]:
    return [build_visit_appointment_row_dto(v) for v in visits]


def build_summary_counts(lab_user: LabUser, *, date_preset: str = "") -> dict[str, int]:
    today = timezone.localdate()
    date_from, date_to = date_range_from_preset(date_preset)
    if not date_from:
        date_from = today
        date_to = today

    base = base_visit_queryset(lab_user)
    on_date = base.filter(
        appointment_date__gte=date_from,
        appointment_date__lte=date_to,
    )

    def count_tab(tab: str) -> int:
        statuses = _statuses_for_tab(tab)
        if not statuses:
            return 0
        return on_date.filter(status__in=statuses).count()

    return {
        "scheduled_today": count_tab("scheduled"),
        "confirmed_today": count_tab("confirmed"),
        "checked_in": count_tab("checked_in"),
        "completed_today": count_tab("completed"),
        "failed_no_show": count_tab("failed"),
    }

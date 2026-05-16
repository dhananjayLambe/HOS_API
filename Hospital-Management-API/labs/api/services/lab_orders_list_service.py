"""Query and filter lab order assignments for the dashboard list API."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time

from django.db.models import Prefetch, Q
from django.utils import timezone

from consultations_core.models.investigation import InvestigationItem
from diagnostics_engine.models.orders import DiagnosticOrderItem, DiagnosticOrderTestLine
from labs.api.services.lab_orders_presenter import (
    LabOrderListRowDTO,
    build_list_row_dto,
    investigation_urgency_for_filter,
)
from labs.choices.workflow import LabAssignmentStatus
from labs.models import LabOrderAssignment, LabUser

_ALLOWED_ORDERING = {
    "-assigned_at": "-assigned_at",
    "assigned_at": "assigned_at",
    "-created_at": "-diagnostic_order__created_at",
    "created_at": "diagnostic_order__created_at",
}


@dataclass(frozen=True)
class LabOrdersListParams:
    q: str = ""
    status: str = ""
    collection_type: str = ""
    urgency: str = ""
    date_from: date | None = None
    date_to: date | None = None
    ordering: str = "-assigned_at"


def base_assignments_queryset(lab_user: LabUser):
    return (
        LabOrderAssignment.objects.filter(
            lab_branch_id=lab_user.branch_id,
            is_deleted=False,
        )
        .select_related(
            "diagnostic_order",
            "diagnostic_order__patient_profile",
            "diagnostic_order__patient_profile__account__user",
            "diagnostic_order__doctor",
            "diagnostic_order__doctor__user",
            "diagnostic_order__consultation",
            "diagnostic_order__consultation__encounter",
            "diagnostic_order__consultation__encounter__clinic",
            "lab_branch",
        )
        .prefetch_related(
            Prefetch(
                "diagnostic_order__test_lines",
                queryset=DiagnosticOrderTestLine.objects.select_related("service").prefetch_related(
                    "sample_tracking",
                    "test_report",
                ),
            ),
            Prefetch(
                "diagnostic_order__items",
                queryset=DiagnosticOrderItem.objects.filter(deleted_at__isnull=True),
            ),
            "diagnostic_order__collection_request",
            "diagnostic_order__visit_appointment",
        )
    )


def apply_list_filters(qs, params: LabOrdersListParams):
    if params.status and params.status in LabAssignmentStatus.values:
        qs = qs.filter(status=params.status)

    if params.collection_type == "HOME":
        qs = qs.filter(diagnostic_order__sample_collection_mode="home")
    elif params.collection_type == "VISIT":
        qs = qs.filter(diagnostic_order__sample_collection_mode="lab")

    if params.date_from:
        qs = qs.filter(assigned_at__gte=_start_of_day(params.date_from))
    if params.date_to:
        qs = qs.filter(assigned_at__lte=_end_of_day(params.date_to))

    q = (params.q or "").strip()
    if q:
        qs = qs.filter(
            Q(diagnostic_order__order_number__icontains=q)
            | Q(diagnostic_order__patient_profile__first_name__icontains=q)
            | Q(diagnostic_order__patient_profile__last_name__icontains=q)
            | Q(diagnostic_order__patient_profile__account__user__username__icontains=q)
        )

    inv_urgency = investigation_urgency_for_filter(params.urgency)
    if inv_urgency:
        qs = qs.filter(
            diagnostic_order__items__consultation_investigation_items__urgency=inv_urgency,
            diagnostic_order__items__deleted_at__isnull=True,
        ).distinct()

    ordering = _ALLOWED_ORDERING.get(params.ordering, "-assigned_at")
    return qs.order_by(ordering)


def parse_list_params(query_params) -> LabOrdersListParams:
    date_from = _parse_date_param(query_params.get("date_from"))
    date_to = _parse_date_param(query_params.get("date_to"))
    ordering = (query_params.get("ordering") or "-assigned_at").strip()
    if ordering not in _ALLOWED_ORDERING:
        ordering = "-assigned_at"

    return LabOrdersListParams(
        q=(query_params.get("q") or "").strip(),
        status=(query_params.get("status") or "").strip().upper(),
        collection_type=(query_params.get("collection_type") or "").strip().upper(),
        urgency=(query_params.get("urgency") or "").strip().upper(),
        date_from=date_from,
        date_to=date_to,
        ordering=ordering,
    )


def _start_of_day(day: date) -> datetime:
    tz = timezone.get_current_timezone()
    return timezone.make_aware(datetime.combine(day, time.min), tz)


def _end_of_day(day: date) -> datetime:
    tz = timezone.get_current_timezone()
    return timezone.make_aware(datetime.combine(day, time.max), tz)


def _parse_date_param(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def load_investigations_for_assignments(assignments) -> dict[str, InvestigationItem]:
    item_ids: set[str] = set()
    for assignment in assignments:
        order = assignment.diagnostic_order
        for oi in order.items.all():
            inv_id = (oi.metadata_snapshot or {}).get("investigation_item_id")
            if inv_id:
                item_ids.add(str(inv_id))

    if not item_ids:
        return {}

    rows = InvestigationItem.objects.filter(id__in=item_ids).only("id", "urgency")
    return {str(row.id): row for row in rows}


def build_row_dtos(assignments) -> list[LabOrderListRowDTO]:
    investigations = load_investigations_for_assignments(assignments)
    return [build_list_row_dto(a, investigations) for a in assignments]

"""Query, filter, and map branch pricing catalog rows."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from django.db.models import Count, Prefetch, Q

from diagnostics_engine.models.catalog import DiagnosticPackageItem
from labs.api.services.pricing_catalog_dto import PackagePricingRowDTO, ServicePricingRowDTO
from labs.api.services.pricing_catalog_presenter import (
    included_tests_from_package,
    package_row_from_model,
    service_row_from_model,
)
from labs.models.branch_pricing import BranchPackagePricing, BranchServicePricing

ALLOWED_SERVICE_ORDERING = {
    "name",
    "-name",
    "selling_price",
    "-selling_price",
    "report_delivery_hours",
    "-report_delivery_hours",
    "updated_at",
    "-updated_at",
}

ALLOWED_PACKAGE_ORDERING = ALLOWED_SERVICE_ORDERING | {
    "tests_count",
    "-tests_count",
}

INVALID_ORDERING_DETAIL = "Invalid ordering."


class PricingCatalogQueryError(Exception):
    """Invalid list query parameters for pricing catalog APIs."""

    def __init__(self, detail: str) -> None:
        self.detail = detail
        super().__init__(detail)

_SERVICE_ORDER_MAP = {
    "name": "service__name",
    "-name": "-service__name",
    "selling_price": "selling_price",
    "-selling_price": "-selling_price",
    "report_delivery_hours": "report_delivery_hours",
    "-report_delivery_hours": "-report_delivery_hours",
    "updated_at": "updated_at",
    "-updated_at": "-updated_at",
}

_PACKAGE_ORDER_MAP = {
    **_SERVICE_ORDER_MAP,
    "name": "package__name",
    "-name": "-package__name",
    "tests_count": "tests_count",
    "-tests_count": "-tests_count",
}


@dataclass(frozen=True)
class PricingCatalogListParams:
    q: str = ""
    status: str = ""
    home_collection: str = ""
    tat_min: int | None = None
    tat_max: int | None = None
    ordering: str = "name"


def parse_int_query_param(name: str, raw) -> int | None:
    if raw in (None, ""):
        return None
    try:
        return int(raw)
    except (TypeError, ValueError) as exc:
        raise PricingCatalogQueryError(f"Invalid {name}.") from exc


def _parse_ordering(query_params, *, allowed: set[str]) -> str:
    ordering = (query_params.get("ordering") or "name").strip()
    if ordering not in allowed:
        raise PricingCatalogQueryError(INVALID_ORDERING_DETAIL)
    return ordering


def _parse_common_list_params(query_params, *, allowed_ordering: set[str]) -> PricingCatalogListParams:
    return PricingCatalogListParams(
        q=(query_params.get("q") or "").strip(),
        status=(query_params.get("status") or "").strip().lower(),
        home_collection=(query_params.get("home_collection") or "").strip().lower(),
        tat_min=parse_int_query_param("tat_min", query_params.get("tat_min")),
        tat_max=parse_int_query_param("tat_max", query_params.get("tat_max")),
        ordering=_parse_ordering(query_params, allowed=allowed_ordering),
    )


def parse_service_list_params(query_params) -> PricingCatalogListParams:
    return _parse_common_list_params(query_params, allowed_ordering=ALLOWED_SERVICE_ORDERING)


def parse_package_list_params(query_params) -> PricingCatalogListParams:
    return _parse_common_list_params(query_params, allowed_ordering=ALLOWED_PACKAGE_ORDERING)


def parse_list_params(query_params) -> PricingCatalogListParams:
    """Backward-compatible alias — prefer parse_service_list_params."""
    return parse_service_list_params(query_params)


def resolve_service_ordering(ordering: str) -> str:
    return _SERVICE_ORDER_MAP[ordering]


def resolve_package_ordering(ordering: str) -> str:
    return _PACKAGE_ORDER_MAP[ordering]


def _apply_status_filter(qs, status: str):
    if status == "available":
        return qs.filter(is_available=True)
    if status == "unavailable":
        return qs.filter(is_available=False)
    if status == "active":
        return qs.filter(is_active=True)
    if status == "inactive":
        return qs.filter(is_active=False)
    return qs


def _apply_home_collection_filter(qs, home_collection: str):
    if home_collection in ("true", "1", "yes"):
        return qs.filter(home_collection_supported=True)
    if home_collection in ("false", "0", "no"):
        return qs.filter(home_collection_supported=False)
    return qs


def _apply_tat_filter(qs, *, tat_min: int | None, tat_max: int | None):
    if tat_min is not None:
        qs = qs.filter(report_delivery_hours__gte=tat_min)
    if tat_max is not None:
        qs = qs.filter(report_delivery_hours__lte=tat_max)
    return qs


def _apply_search_services(qs, q: str):
    if not q:
        return qs
    return qs.filter(
        Q(service__name__icontains=q)
        | Q(service__code__icontains=q)
        | Q(service__category__name__icontains=q)
    )


def _apply_search_packages(qs, q: str):
    if not q:
        return qs
    return qs.filter(
        Q(package__name__icontains=q)
        | Q(package__lineage_code__icontains=q)
        | Q(package__category__name__icontains=q)
    )


def _default_active_scope(qs, status: str):
    if status == "inactive":
        return qs
    return qs.filter(is_active=True)


def base_service_pricing_queryset(branch_id: UUID):
    return BranchServicePricing.objects.filter(
        branch_id=branch_id,
        is_deleted=False,
    ).select_related("service", "service__category")


def base_package_pricing_queryset(branch_id: UUID):
    item_qs = DiagnosticPackageItem.objects.filter(deleted_at__isnull=True).select_related("service")
    return (
        BranchPackagePricing.objects.filter(
            branch_id=branch_id,
            is_deleted=False,
        )
        .select_related("package", "package__category")
        .prefetch_related(Prefetch("package__items", queryset=item_qs))
        .annotate(
            tests_count=Count(
                "package__items",
                filter=Q(package__items__deleted_at__isnull=True),
            )
        )
    )


def apply_service_filters(qs, params: PricingCatalogListParams):
    qs = _default_active_scope(qs, params.status)
    qs = _apply_status_filter(qs, params.status)
    qs = _apply_home_collection_filter(qs, params.home_collection)
    qs = _apply_tat_filter(qs, tat_min=params.tat_min, tat_max=params.tat_max)
    qs = _apply_search_services(qs, params.q)
    return qs.order_by(resolve_service_ordering(params.ordering))


def apply_package_filters(qs, params: PricingCatalogListParams):
    qs = _default_active_scope(qs, params.status)
    qs = _apply_status_filter(qs, params.status)
    qs = _apply_home_collection_filter(qs, params.home_collection)
    qs = _apply_tat_filter(qs, tat_min=params.tat_min, tat_max=params.tat_max)
    qs = _apply_search_packages(qs, params.q)
    return qs.order_by(resolve_package_ordering(params.ordering))


def build_service_row_dtos(rows: list[BranchServicePricing]) -> list[ServicePricingRowDTO]:
    return [service_row_from_model(row) for row in rows]


def build_package_row_dtos(rows: list[BranchPackagePricing]) -> list[PackagePricingRowDTO]:
    out: list[PackagePricingRowDTO] = []
    for row in rows:
        included = included_tests_from_package(row)
        tests_count = getattr(row, "tests_count", None)
        if tests_count is None:
            tests_count = len(included)
        out.append(
            package_row_from_model(
                row,
                tests_count=int(tests_count),
                included_tests=included,
            )
        )
    return out

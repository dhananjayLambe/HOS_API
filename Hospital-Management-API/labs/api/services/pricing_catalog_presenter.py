"""Presentation layer for operational diagnostics catalog rows.

Package platform margin derivation is intentionally deferred in Phase 1 to avoid
exposing inferred financial calculations in the branch operational catalog.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from django.utils import timezone

from diagnostics_engine.models.choices import FulfillmentMode
from labs.api.services.pricing_catalog_dto import (
    IncludedTestDTO,
    PackagePricingRowDTO,
    ServicePricingRowDTO,
)
from labs.models.branch_pricing import BranchPackagePricing, BranchServicePricing

PREVIEW_TEST_NAMES_LIMIT = 2
API_VERSION = "v1"

# Strip finance/settlement keys if sync jobs ever write them into metadata JSON.
_FORBIDDEN_METADATA_KEYS = frozenset({
    "doctor_margin_snapshot",
    "platform_margin_snapshot",
    "lab_payout_snapshot",
    "doctor_commission_value",
    "doctor_commission_type",
    "settlement_cycle",
    "platform_margin_type",
    "platform_margin_value",
    "cost_price",
    "selling_price",
    "platform_margin",
    "lab_payout",
    "doctor_margin",
})


def sanitize_catalog_metadata(metadata: dict[str, Any] | None) -> dict[str, Any]:
    if not metadata or not isinstance(metadata, dict):
        return {}
    return {key: value for key, value in metadata.items() if key not in _FORBIDDEN_METADATA_KEYS}


def _parse_metadata_last_synced(metadata: dict[str, Any] | None) -> datetime | None:
    if not metadata:
        return None
    raw = metadata.get("last_synced_at")
    if not raw:
        return None
    if isinstance(raw, datetime):
        return raw
    if isinstance(raw, str):
        try:
            return datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def resolve_last_synced_at(*, updated_at: datetime, metadata: dict[str, Any] | None) -> str | None:
    meta_dt = _parse_metadata_last_synced(metadata)
    dt = meta_dt or updated_at
    if dt is None:
        return None
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.get_current_timezone())
    return dt.isoformat()


def _is_expired(valid_to: date | None, *, today: date | None = None) -> bool:
    if not valid_to:
        return False
    today = today or timezone.localdate()
    return valid_to < today


def compute_display_status(*, is_active: bool, is_available: bool, valid_to: date | None) -> str:
    if not is_active:
        return "Inactive"
    if _is_expired(valid_to):
        return "Expired"
    if not is_available:
        return "Hidden"
    return "Available"


def compute_catalog_visibility(*, is_active: bool, is_available: bool) -> str:
    if not is_active:
        return "retired"
    if not is_available:
        return "hidden"
    return "visible"


def format_validity_label(*, valid_from: date, valid_to: date | None) -> str:
    if valid_to:
        return f"Valid till {valid_to.strftime('%d %b %Y')}"
    return f"Valid from {valid_from.strftime('%d %b %Y')}"


def format_price_display(amount: Decimal, currency: str) -> str:
    code = (currency or "INR").upper()
    try:
        return f"{code} {amount:,.2f}"
    except (TypeError, ValueError):
        return f"{code} {amount}"


def format_optional_price_display(amount: Decimal | None, currency: str) -> str:
    if amount is None:
        return "—"
    return format_price_display(amount, currency)


def resolve_platform_margin(
    *,
    selling_price: Decimal,
    cost_price: Decimal | None,
    platform_margin_snapshot: Decimal | None,
) -> Decimal | None:
    if cost_price is not None:
        return selling_price - cost_price
    if platform_margin_snapshot is not None:
        return platform_margin_snapshot
    return None


def format_tat_label(hours: int) -> str:
    return f"{hours}h"


def format_fulfillment_label(mode: str) -> str:
    if mode == FulfillmentMode.STRICT:
        return "Strict"
    if mode == FulfillmentMode.PARTIAL:
        return "Partial"
    return (mode or "").replace("_", " ").title() or "—"


def build_included_tests_preview(names: list[str], *, limit: int = PREVIEW_TEST_NAMES_LIMIT) -> str:
    if not names:
        return "—"
    if len(names) <= limit:
        return ", ".join(names)
    shown = names[:limit]
    overflow = len(names) - limit
    return f"{', '.join(shown)} +{overflow}"


def service_row_from_model(row: BranchServicePricing) -> ServicePricingRowDTO:
    svc = row.service
    cat = svc.category
    meta = sanitize_catalog_metadata(row.metadata if isinstance(row.metadata, dict) else {})
    valid_to = row.valid_to
    display_status = compute_display_status(
        is_active=row.is_active,
        is_available=row.is_available,
        valid_to=valid_to,
    )
    catalog_visibility = compute_catalog_visibility(
        is_active=row.is_active,
        is_available=row.is_available,
    )
    workflow_hint = str(meta.get("workflow_hint") or "").strip()
    currency = row.currency or "INR"
    cost_price = row.cost_price
    platform_margin = resolve_platform_margin(
        selling_price=row.selling_price,
        cost_price=cost_price,
        platform_margin_snapshot=row.platform_margin_snapshot,
    )
    return ServicePricingRowDTO(
        id=str(row.id),
        service_name=svc.name,
        service_code=svc.code,
        category_name=cat.name if cat else "",
        selling_price=row.selling_price,
        cost_price=cost_price,
        platform_margin=platform_margin,
        currency=currency,
        home_collection_supported=row.home_collection_supported,
        report_delivery_hours=row.report_delivery_hours,
        is_active=row.is_active,
        is_available=row.is_available,
        valid_from=row.valid_from,
        valid_to=valid_to,
        metadata=meta,
        updated_at=row.updated_at,
        workflow_hint=workflow_hint,
        display_status=display_status,
        catalog_visibility=catalog_visibility,
        last_synced_at=resolve_last_synced_at(updated_at=row.updated_at, metadata=meta),
        is_sync_managed=True,
        is_expired=_is_expired(valid_to),
        validity_label=format_validity_label(valid_from=row.valid_from, valid_to=valid_to),
        tat_label=format_tat_label(row.report_delivery_hours),
        price_display=format_price_display(row.selling_price, currency),
        cost_price_display=format_optional_price_display(cost_price, currency),
        platform_margin_display=format_optional_price_display(platform_margin, currency),
    )


def package_row_from_model(
    row: BranchPackagePricing,
    *,
    tests_count: int,
    included_tests: list[IncludedTestDTO],
) -> PackagePricingRowDTO:
    # Phase 1: cost_price and platform_margin stay None (display "—"). Do not derive from
    # lab_payout_snapshot or platform_margin_value — avoids inferred finance in branch UI.
    pkg = row.package
    cat = pkg.category
    meta = sanitize_catalog_metadata(row.metadata if isinstance(row.metadata, dict) else {})
    valid_to = row.valid_to
    display_status = compute_display_status(
        is_active=row.is_active,
        is_available=row.is_available,
        valid_to=valid_to,
    )
    catalog_visibility = compute_catalog_visibility(
        is_active=row.is_active,
        is_available=row.is_available,
    )
    test_names = [t.name for t in included_tests]
    currency = row.currency or "INR"
    return PackagePricingRowDTO(
        id=str(row.id),
        package_name=pkg.name,
        package_lineage_code=pkg.lineage_code,
        category_name=cat.name if cat else "",
        tests_count=tests_count,
        mrp=row.mrp,
        selling_price=row.selling_price,
        cost_price=None,
        platform_margin=None,
        currency=currency,
        fulfillment_mode=row.fulfillment_mode,
        home_collection_supported=row.home_collection_supported,
        report_delivery_hours=row.report_delivery_hours,
        is_active=row.is_active,
        is_available=row.is_available,
        valid_from=row.valid_from,
        valid_to=valid_to,
        included_tests=included_tests,
        metadata=meta,
        updated_at=row.updated_at,
        display_status=display_status,
        catalog_visibility=catalog_visibility,
        last_synced_at=resolve_last_synced_at(updated_at=row.updated_at, metadata=meta),
        is_sync_managed=True,
        is_expired=_is_expired(valid_to),
        validity_label=format_validity_label(valid_from=row.valid_from, valid_to=valid_to),
        tat_label=format_tat_label(row.report_delivery_hours),
        price_display=format_price_display(row.selling_price, currency),
        mrp_display=format_price_display(row.mrp, currency),
        cost_price_display="—",
        platform_margin_display="—",
        fulfillment_label=format_fulfillment_label(row.fulfillment_mode),
        included_tests_preview=build_included_tests_preview(test_names),
    )


def included_tests_from_package(row: BranchPackagePricing) -> list[IncludedTestDTO]:
    items = []
    if hasattr(row.package, "_prefetched_objects_cache") and "items" in row.package._prefetched_objects_cache:
        raw_items = row.package._prefetched_objects_cache["items"]
    else:
        raw_items = row.package.items.filter(deleted_at__isnull=True).select_related("service")
    for item in raw_items:
        if getattr(item, "deleted_at", None):
            continue
        svc = item.service
        items.append(IncludedTestDTO(name=svc.name, code=svc.code))
    return items

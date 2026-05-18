"""DTOs for operational diagnostics catalog (pricing visibility) APIs."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from typing import Any


@dataclass(frozen=True)
class IncludedTestDTO:
    name: str
    code: str


@dataclass(frozen=True)
class ServicePricingRowDTO:
    id: str
    service_name: str
    service_code: str
    category_name: str
    selling_price: Decimal
    cost_price: Decimal | None
    platform_margin: Decimal | None
    currency: str
    home_collection_supported: bool
    report_delivery_hours: int
    is_active: bool
    is_available: bool
    valid_from: date
    valid_to: date | None
    metadata: dict[str, Any]
    updated_at: datetime
    workflow_hint: str
    display_status: str
    catalog_visibility: str
    last_synced_at: str | None
    is_sync_managed: bool
    is_expired: bool
    validity_label: str
    tat_label: str
    price_display: str
    cost_price_display: str
    platform_margin_display: str


@dataclass(frozen=True)
class PackagePricingRowDTO:
    id: str
    package_name: str
    package_lineage_code: str
    category_name: str
    tests_count: int
    mrp: Decimal
    selling_price: Decimal
    cost_price: Decimal | None
    platform_margin: Decimal | None
    currency: str
    fulfillment_mode: str
    home_collection_supported: bool
    report_delivery_hours: int
    is_active: bool
    is_available: bool
    valid_from: date
    valid_to: date | None
    included_tests: list[IncludedTestDTO]
    metadata: dict[str, Any]
    updated_at: datetime
    display_status: str
    catalog_visibility: str
    last_synced_at: str | None
    is_sync_managed: bool
    is_expired: bool
    validity_label: str
    tat_label: str
    price_display: str
    mrp_display: str
    cost_price_display: str
    platform_margin_display: str
    fulfillment_label: str
    included_tests_preview: str


@dataclass(frozen=True)
class PricingCatalogSummaryDTO:
    active_services: int
    active_packages: int
    home_collection_enabled: int
    avg_tat_hours: float | None
    unavailable_tests: int

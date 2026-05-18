"""Aggregated KPIs for operational diagnostics catalog."""

from __future__ import annotations

from uuid import UUID

from django.db.models import Avg

from labs.api.services.pricing_catalog_dto import PricingCatalogSummaryDTO
from labs.models.branch_pricing import BranchPackagePricing, BranchServicePricing


def build_pricing_summary(branch_id: UUID) -> PricingCatalogSummaryDTO:
    """
    Branch-scoped catalog summary metrics.

    Structured for future caching (Redis / materialized views); Phase 1 is direct ORM.
    """
    svc_base = BranchServicePricing.objects.filter(branch_id=branch_id, is_deleted=False)
    pkg_base = BranchPackagePricing.objects.filter(branch_id=branch_id, is_deleted=False)

    active_services = svc_base.filter(is_active=True).count()
    active_packages = pkg_base.filter(is_active=True).count()

    home_svc = svc_base.filter(is_active=True, home_collection_supported=True).count()
    home_pkg = pkg_base.filter(is_active=True, home_collection_supported=True).count()
    home_collection_enabled = home_svc + home_pkg

    avg_row = (
        svc_base.filter(is_active=True, is_available=True)
        .aggregate(avg=Avg("report_delivery_hours"))
    )
    avg_val = avg_row.get("avg")
    avg_tat_hours = float(avg_val) if avg_val is not None else None

    unavailable_tests = svc_base.filter(is_active=True, is_available=False).count()

    return PricingCatalogSummaryDTO(
        active_services=active_services,
        active_packages=active_packages,
        home_collection_enabled=home_collection_enabled,
        avg_tat_hours=avg_tat_hours,
        unavailable_tests=unavailable_tests,
    )

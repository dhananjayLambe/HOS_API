"""Thin serializers — DTO to JSON only (no business formatting)."""

from rest_framework import serializers

from labs.api.services.pricing_catalog_dto import (
    PackagePricingRowDTO,
    PricingCatalogSummaryDTO,
    ServicePricingRowDTO,
)
from labs.api.services.pricing_catalog_presenter import API_VERSION


class IncludedTestSerializer(serializers.Serializer):
    name = serializers.CharField()
    code = serializers.CharField()


def service_dto_to_representation(dto: ServicePricingRowDTO) -> dict:
    return {
        "id": dto.id,
        "service_name": dto.service_name,
        "service_code": dto.service_code,
        "category_name": dto.category_name,
        "selling_price": str(dto.selling_price),
        "cost_price": str(dto.cost_price) if dto.cost_price is not None else None,
        "platform_margin": str(dto.platform_margin) if dto.platform_margin is not None else None,
        "currency": dto.currency,
        "home_collection_supported": dto.home_collection_supported,
        "report_delivery_hours": dto.report_delivery_hours,
        "is_active": dto.is_active,
        "is_available": dto.is_available,
        "valid_from": dto.valid_from.isoformat(),
        "valid_to": dto.valid_to.isoformat() if dto.valid_to else None,
        "metadata": dto.metadata,
        "updated_at": dto.updated_at.isoformat() if dto.updated_at else None,
        "workflow_hint": dto.workflow_hint,
        "display_status": dto.display_status,
        "catalog_visibility": dto.catalog_visibility,
        "last_synced_at": dto.last_synced_at,
        "is_sync_managed": dto.is_sync_managed,
        "is_expired": dto.is_expired,
        "validity_label": dto.validity_label,
        "tat_label": dto.tat_label,
        "price_display": dto.price_display,
        "cost_price_display": dto.cost_price_display,
        "platform_margin_display": dto.platform_margin_display,
    }


def package_dto_to_representation(dto: PackagePricingRowDTO) -> dict:
    return {
        "id": dto.id,
        "package_name": dto.package_name,
        "package_lineage_code": dto.package_lineage_code,
        "category_name": dto.category_name,
        "tests_count": dto.tests_count,
        "mrp": str(dto.mrp),
        "selling_price": str(dto.selling_price),
        "cost_price": None,
        "platform_margin": None,
        "currency": dto.currency,
        "fulfillment_mode": dto.fulfillment_mode,
        "home_collection_supported": dto.home_collection_supported,
        "report_delivery_hours": dto.report_delivery_hours,
        "is_active": dto.is_active,
        "is_available": dto.is_available,
        "valid_from": dto.valid_from.isoformat(),
        "valid_to": dto.valid_to.isoformat() if dto.valid_to else None,
        "included_tests": [{"name": t.name, "code": t.code} for t in dto.included_tests],
        "metadata": dto.metadata,
        "updated_at": dto.updated_at.isoformat() if dto.updated_at else None,
        "display_status": dto.display_status,
        "catalog_visibility": dto.catalog_visibility,
        "last_synced_at": dto.last_synced_at,
        "is_sync_managed": dto.is_sync_managed,
        "is_expired": dto.is_expired,
        "validity_label": dto.validity_label,
        "tat_label": dto.tat_label,
        "price_display": dto.price_display,
        "mrp_display": dto.mrp_display,
        "cost_price_display": dto.cost_price_display,
        "platform_margin_display": dto.platform_margin_display,
        "fulfillment_label": dto.fulfillment_label,
        "included_tests_preview": dto.included_tests_preview,
    }


def summary_dto_to_representation(dto: PricingCatalogSummaryDTO) -> dict:
    return {
        "version": API_VERSION,
        "active_services": dto.active_services,
        "active_packages": dto.active_packages,
        "home_collection_enabled": dto.home_collection_enabled,
        "avg_tat_hours": dto.avg_tat_hours,
        "unavailable_tests": dto.unavailable_tests,
    }

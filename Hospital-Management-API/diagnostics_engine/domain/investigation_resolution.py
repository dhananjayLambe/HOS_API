"""Shared investigation → service resolution for booking and pre-booking recommendation."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from django.core.exceptions import ValidationError

from consultations_core.models.consultation import Consultation
from consultations_core.models.investigation import (
    InvestigationItem,
    InvestigationSource,
    InvestigationStatus,
)
from consultations_core.services.investigation_api_service import get_or_create_investigations_container
from diagnostics_engine.domain.package_orders import build_composition_snapshot
from diagnostics_engine.domain.pricing import PricingQuoteService
from diagnostics_engine.models.catalog import DiagnosticServiceMaster
from labs.models import BranchPackagePricing, LabBranch

if TYPE_CHECKING:
    pass


def normalize_package_composition(inv: InvestigationItem) -> list[dict[str, Any]]:
    """Build composition rows for expansion; raises ValidationError if invalid."""
    pkg = inv.diagnostic_package
    if not pkg:
        raise ValidationError("Package investigation is missing diagnostic_package.")

    raw = inv.package_expansion_snapshot
    if isinstance(raw, list) and len(raw) > 0:
        out: list[dict[str, Any]] = []
        for row in raw:
            if not isinstance(row, dict):
                raise ValidationError("Invalid package_expansion_snapshot row (expected object).")
            if row.get("included") is False:
                continue
            sid = row.get("service_id")
            if not sid:
                raise ValidationError("package_expansion_snapshot row missing service_id.")
            try:
                svc = DiagnosticServiceMaster.objects.get(pk=sid)
            except DiagnosticServiceMaster.DoesNotExist as exc:
                raise ValidationError(f"Unknown service in package snapshot: {sid}.") from exc
            if not svc.is_active or svc.deleted_at is not None:
                raise ValidationError(f"Service {svc.code} is not active.")
            out.append(
                {
                    "service_id": str(svc.id),
                    "quantity": int(row.get("quantity", 1)),
                    "is_mandatory": bool(row.get("is_mandatory", True)),
                    "display_order": int(row.get("display_order", 0)),
                }
            )
        if not out:
            raise ValidationError("Package investigation has no included services in snapshot.")
        return out

    snap = build_composition_snapshot(pkg)
    if not snap:
        raise ValidationError(f"Package {pkg.name} has no active composition lines.")
    for row in snap:
        sid = row["service_id"]
        try:
            svc = DiagnosticServiceMaster.objects.get(pk=sid)
        except DiagnosticServiceMaster.DoesNotExist as exc:
            raise ValidationError(f"Unknown service in package composition: {sid}.") from exc
        if not svc.is_active or svc.deleted_at is not None:
            raise ValidationError(f"Service {svc.code} is not active.")
    return snap


def load_convertible_investigation_items(consultation: Consultation) -> list[InvestigationItem]:
    """Load catalog/package investigation lines; raises ValidationError on custom or empty."""
    container = get_or_create_investigations_container(consultation)
    items = list(
        InvestigationItem.objects.filter(
            investigations=container,
            is_deleted=False,
        )
        .exclude(status=InvestigationStatus.CANCELLED)
        .select_related(
            "catalog_item",
            "catalog_item__category",
            "diagnostic_package",
            "diagnostic_package__category",
            "custom_investigation",
        )
        .order_by("position", "created_at")
    )

    if not items:
        raise ValidationError("No active investigations on consultation.")

    has_custom = any(inv.source == InvestigationSource.CUSTOM or inv.is_custom for inv in items)
    convertible = [inv for inv in items if inv.source in (InvestigationSource.CATALOG, InvestigationSource.PACKAGE)]

    if has_custom and not convertible:
        raise ValidationError("Only custom investigations present; none are lab-convertible.")

    if has_custom:
        raise ValidationError(
            "Consultation has custom investigations that cannot be converted to a diagnostic order. "
            "Remove or replace them before ordering."
        )

    if not convertible:
        raise ValidationError("No active catalog or package investigations to order.")

    for inv in convertible:
        if inv.source == InvestigationSource.CATALOG:
            if not inv.catalog_item_id:
                raise ValidationError("Catalog investigation is missing catalog_item.")
            svc = inv.catalog_item
            if not svc.is_active or svc.deleted_at is not None:
                raise ValidationError(f"Service {svc.code} is not active or is discontinued.")
        elif inv.source == InvestigationSource.PACKAGE:
            if not inv.diagnostic_package_id:
                raise ValidationError("Package investigation is missing diagnostic_package.")
            if not inv.diagnostic_package.is_active:
                raise ValidationError(f"Package {inv.diagnostic_package.name} is not active.")
            normalize_package_composition(inv)
        else:
            raise ValidationError(f"Unsupported investigation source: {inv.source}.")

    return convertible


def extract_required_service_ids(investigations: list[InvestigationItem]) -> list[Any]:
    """
    Unique service IDs required for routing eligibility.

    Mirrors EligibilityEngine.evaluate_all: dedupe by service_id after ordering by service name.
    """
    raw_ids: list[Any] = []
    for inv in investigations:
        if inv.source == InvestigationSource.CATALOG:
            raw_ids.append(inv.catalog_item_id)
        elif inv.source == InvestigationSource.PACKAGE:
            composition = normalize_package_composition(inv)
            for row in composition:
                for _ in range(int(row.get("quantity", 1))):
                    raw_ids.append(row["service_id"])

    if not raw_ids:
        return []

    services = {
        str(s.pk): s
        for s in DiagnosticServiceMaster.objects.filter(pk__in=set(raw_ids)).only("pk", "name", "code")
    }
    ordered = sorted(
        raw_ids,
        key=lambda sid: (services.get(str(sid), DiagnosticServiceMaster()).name or "", str(sid)),
    )
    seen: set[Any] = set()
    out: list[Any] = []
    for sid in ordered:
        if sid not in seen:
            seen.add(sid)
            out.append(sid)
    return out


def derive_sample_collection_mode(
    investigations: list[InvestigationItem],
    *,
    branch: LabBranch | None = None,
) -> str:
    """Same rules as DiagnosticOrderCreationService._create_order_items (no persistence)."""
    any_home = False
    for inv in investigations:
        if inv.source == InvestigationSource.CATALOG:
            svc = inv.catalog_item
            if branch:
                try:
                    quote = PricingQuoteService.quote_service_line(branch, svc)
                    is_home = bool(quote.get("home_collection_supported"))
                except ValueError:
                    is_home = bool(svc.home_collection_possible)
            else:
                is_home = bool(svc.home_collection_possible)
        else:
            pkg = inv.diagnostic_package
            if branch:
                try:
                    quote = PricingQuoteService.quote_package_line(branch, pkg)
                    bpp_id = quote.get("branch_package_pricing_id")
                    bpp = BranchPackagePricing.objects.filter(pk=bpp_id).first() if bpp_id else None
                    is_home = bool(bpp.home_collection_supported) if bpp else False
                except ValueError:
                    is_home = False
            else:
                is_home = False
        any_home = any_home or is_home
    return "home" if any_home else "lab"


def build_expanded_test_summaries(investigations: list[InvestigationItem]) -> list[dict[str, Any]]:
    """Expanded test lines for recommendation DTO (service_id, code, name, quantity)."""
    rows: list[dict[str, Any]] = []
    for inv in investigations:
        if inv.source == InvestigationSource.CATALOG:
            svc = inv.catalog_item
            rows.append(
                {
                    "service_id": str(svc.pk),
                    "code": svc.code,
                    "name": svc.name,
                    "quantity": 1,
                    "investigation_item_id": str(inv.pk),
                }
            )
        elif inv.source == InvestigationSource.PACKAGE:
            for comp in normalize_package_composition(inv):
                svc = DiagnosticServiceMaster.objects.filter(pk=comp["service_id"]).first()
                rows.append(
                    {
                        "service_id": comp["service_id"],
                        "code": getattr(svc, "code", "") or "",
                        "name": getattr(svc, "name", "") or "",
                        "quantity": int(comp.get("quantity", 1)),
                        "investigation_item_id": str(inv.pk),
                        "package_id": str(inv.diagnostic_package_id),
                    }
                )
    return rows


def build_package_summaries(investigations: list[InvestigationItem]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for inv in investigations:
        if inv.source == InvestigationSource.PACKAGE and inv.diagnostic_package:
            pkg = inv.diagnostic_package
            out.append(
                {
                    "investigation_item_id": str(inv.pk),
                    "package_id": str(pkg.pk),
                    "name": pkg.name,
                    "code": pkg.code,
                }
            )
    return out

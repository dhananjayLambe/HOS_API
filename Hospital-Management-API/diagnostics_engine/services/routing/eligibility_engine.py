"""Pure eligibility evaluation for diagnostics routing (no ORM writes)."""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass, field
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from django.db.models import Q
from django.db.models.functions import Trim
from django.utils import timezone

from diagnostics_engine.services.routing.routing_helpers import haversine_km, normalize_indian_pincode

logger = logging.getLogger(__name__)

if TYPE_CHECKING:
    from diagnostics_engine.models.orders import DiagnosticOrder
    from diagnostics_engine.services.routing.routing_helpers import ResolvedRoutingLocation
    from labs.models.lab_auth import LabBranch, LabOrganization


# Stable machine codes for support / AI / analytics
ER_BRANCH_ACTIVE = "branch_active"
ER_ORG_ORDERABLE = "org_orderable"
ER_IN_SERVICE_AREA = "in_service_area"
ER_HAS_SERVICE_PRICING = "has_service_pricing"
ER_WALK_IN_SUPPORTED = "walk_in_supported"
ER_HOME_COLLECTION_SUPPORTED = "home_collection_supported"

IR_BRANCH_INACTIVE = "branch_inactive"
IR_ORG_NOT_ORDERABLE = "org_not_orderable"
IR_OUTSIDE_SERVICE_AREA = "outside_service_area"
IR_MISSING_TEST_PRICING = "missing_test_pricing"
IR_HOME_COLLECTION_NOT_SUPPORTED = "home_collection_not_supported"
IR_WALK_IN_NOT_SUPPORTED = "walk_in_not_supported"
IR_BEYOND_HOME_RADIUS = "beyond_home_collection_radius"


def _pricing_filter_ladder_debug_enabled() -> bool:
    """True when DIAGNOSTIC_ROUTING_PRICING_DEBUG=1 — per-branch filter counts + sample SQL."""
    return os.environ.get("DIAGNOSTIC_ROUTING_PRICING_DEBUG", "").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    )


@dataclass
class EligibilityCandidate:
    lab: LabOrganization
    branch: LabBranch
    supports_all_tests: bool
    supports_home_collection: bool
    distance_km: float | None
    estimated_price: Decimal | None
    estimated_tat_hours: int | None
    missing_tests: list[dict[str, Any]] = field(default_factory=list)
    eligibility_reasons: list[str] = field(default_factory=list)
    ineligibility_reasons: list[str] = field(default_factory=list)


class EligibilityEngine:
    """Determine which lab branches can fulfill the order (no ranking)."""

    @classmethod
    def evaluate_all(
        cls,
        order: DiagnosticOrder,
        location: ResolvedRoutingLocation,
    ) -> list[EligibilityCandidate]:
        """Every marketplace branch evaluated (eligible + ineligible). Used for audit / no-match samples."""
        from diagnostics_engine.models.orders import DiagnosticOrderTestLine
        from diagnostics_engine.services.routing.routing_helpers import routable_lab_branches_queryset

        today = timezone.now().date()
        test_lines = list(
            DiagnosticOrderTestLine.objects.filter(order_id=order.pk)
            .select_related("service")
            .order_by("service__name", "pk")
        )
        if not test_lines:
            return []

        seen_sid: set[Any] = set()
        service_ids: list[Any] = []
        for line in test_lines:
            if line.service_id not in seen_sid:
                seen_sid.add(line.service_id)
                service_ids.append(line.service_id)

        required_tests_debug = [
            {
                "id": str(line.service_id),
                "code": getattr(line.service, "code", "") or "",
                "name": getattr(line.service, "name", "") or "",
            }
            for line in test_lines
        ]

        branches = routable_lab_branches_queryset()

        mode = order.sample_collection_mode or "lab"
        out: list[EligibilityCandidate] = []
        for branch in branches:
            out.append(
                cls._evaluate_branch(
                    branch=branch,
                    service_ids=service_ids,
                    location=location,
                    today=today,
                    mode=mode,
                    required_tests_debug=required_tests_debug,
                )
            )
        return out

    @classmethod
    def evaluate(
        cls,
        order: DiagnosticOrder,
        location: ResolvedRoutingLocation,
    ) -> list[EligibilityCandidate]:
        return [c for c in cls.evaluate_all(order, location) if not c.ineligibility_reasons]

    @classmethod
    def _evaluate_branch(
        cls,
        *,
        branch: LabBranch,
        service_ids: list[Any],
        location: ResolvedRoutingLocation,
        today: Any,
        mode: str,
        required_tests_debug: list[dict[str, Any]],
    ) -> EligibilityCandidate:
        from labs.models.branch_pricing import BranchServiceArea, BranchServicePricing

        org = branch.organization
        er: list[str] = []
        ir: list[str] = []

        if not branch.is_active or branch.is_deleted:
            ir.append(IR_BRANCH_INACTIVE)
        else:
            er.append(ER_BRANCH_ACTIVE)

        if not org.is_active_for_orders or org.is_deleted:
            ir.append(IR_ORG_NOT_ORDERABLE)
        else:
            er.append(ER_ORG_ORDERABLE)

        if mode == "home":
            if not (branch.home_collection_available and org.home_collection_available):
                ir.append(IR_HOME_COLLECTION_NOT_SUPPORTED)
            else:
                er.append(ER_HOME_COLLECTION_SUPPORTED)
        else:
            if not branch.walk_in_collection_available:
                ir.append(IR_WALK_IN_NOT_SUPPORTED)
            else:
                er.append(ER_WALK_IN_SUPPORTED)

        areas_qs = BranchServiceArea.objects.filter(
            branch=branch, is_active=True, is_deleted=False
        )
        if areas_qs.exists():
            matched = None
            np = normalize_indian_pincode(location.pincode)
            if np:
                matched = (
                    areas_qs.annotate(_pc=Trim("pincode"))
                    .filter(_pc=np)
                    .first()
                )
            if matched is None and location.city:
                matched = areas_qs.filter(city__iexact=location.city.strip()).first()
            if matched is None:
                ir.append(IR_OUTSIDE_SERVICE_AREA)
            else:
                er.append(ER_IN_SERVICE_AREA)
                if mode == "home" and not matched.is_home_collection_available:
                    ir.append(IR_HOME_COLLECTION_NOT_SUPPORTED)
        else:
            er.append("no_service_area_records_default_allow")

        missing: list[dict[str, Any]] = []
        price_sum = Decimal("0")
        max_tat = 0
        pricings_used: list[BranchServicePricing] = []
        any_pricing = False

        if _pricing_filter_ladder_debug_enabled():
            base = BranchServicePricing.objects.filter(
                branch=branch,
                service_id__in=service_ids,
                is_deleted=False,
            )
            c0 = base.count()
            c1 = base.filter(is_active=True).count()
            c2 = base.filter(is_active=True, is_available=True).count()
            full_qs = (
                base.filter(is_active=True, is_available=True, valid_from__lte=today)
                .filter(Q(valid_to__isnull=True) | Q(valid_to__gte=today))
            )
            c3 = full_qs.count()
            _dbc = getattr(branch, "branch_code", "") or "—"
            logger.info(
                "Pricing filter ladder | branch=%s (%s) | service_ids_count=%s | "
                "deleted_false=%s +is_active=%s +is_available=%s +valid_window=%s",
                str(branch.pk),
                _dbc,
                len(service_ids),
                c0,
                c1,
                c2,
                c3,
                extra={
                    "branch": str(branch.pk),
                    "branch_code": _dbc,
                    "ladder_deleted_false": c0,
                    "ladder_plus_is_active": c1,
                    "ladder_plus_is_available": c2,
                    "ladder_plus_valid_window": c3,
                    "required_service_ids": [str(s) for s in service_ids],
                },
            )
            if service_ids:
                if c0 > 0:
                    sample_qs = (
                        BranchServicePricing.objects.filter(
                            branch=branch,
                            service_id=service_ids[0],
                            is_deleted=False,
                            is_active=True,
                            is_available=True,
                            valid_from__lte=today,
                        )
                        .filter(Q(valid_to__isnull=True) | Q(valid_to__gte=today))
                        .order_by("-valid_from")
                    )
                    logger.info(
                        "Pricing filter ladder SQL (first service_id=%s; UUIDs may appear unquoted in str(query)) | %s",
                        str(service_ids[0]),
                        str(sample_qs.query),
                    )
                else:
                    logger.info(
                        "Pricing: no BranchServicePricing for branch_id=%s branch_code=%s and "
                        "required service_ids=%s — add rows where service_id matches the order catalog UUID, "
                        "or run: python manage.py inspect_diagnostic_routing_order <order_uuid> "
                        "(see --by-order-number). Seed/copy: seed_diagnostic_routing_minimal_labs / "
                        "seed_diagnostic_routing_dummy_lab (--copy-pricing-from-branch).",
                        str(branch.pk),
                        _dbc,
                        [str(s) for s in service_ids],
                    )

        # Marketplace pricing is keyed by DiagnosticServiceMaster primary key (service_id), not by
        # display name or code. Fuzzy name/code matching is unsafe for billing and clinical traceability.
        for sid in service_ids:
            row = (
                BranchServicePricing.objects.filter(
                    branch=branch,
                    service_id=sid,
                    is_deleted=False,
                    is_active=True,
                    is_available=True,
                    valid_from__lte=today,
                )
                .filter(Q(valid_to__isnull=True) | Q(valid_to__gte=today))
                .order_by("-valid_from")
                .first()
            )
            if row is None:
                missing.append({"service_id": str(sid), "code": IR_MISSING_TEST_PRICING})
                ir.append(IR_MISSING_TEST_PRICING)
            else:
                any_pricing = True
                pricings_used.append(row)
                price_sum += row.selling_price
                max_tat = max(max_tat, int(row.report_delivery_hours or 0))

        if _pricing_filter_ladder_debug_enabled() and IR_MISSING_TEST_PRICING in ir:
            priced = (
                BranchServicePricing.objects.filter(branch=branch, is_deleted=False)
                .select_related("service")
                .order_by("service__code")[:80]
            )
            catalog_slice = [
                {"service_id": str(p.service_id), "code": p.service.code, "name": p.service.name}
                for p in priced
            ]
            logger.info(
                "Pricing mismatch detail | branch_id=%s | required_service_ids=%s | "
                "branch_pricing_catalog_first80=%s",
                str(branch.pk),
                json.dumps([str(s) for s in service_ids]),
                json.dumps(catalog_slice, default=str),
                extra={
                    "branch_id": str(branch.pk),
                    "required_service_ids": [str(s) for s in service_ids],
                    "branch_pricing_catalog_snippet": catalog_slice,
                },
            )

        pricing_rows = list(
            BranchServicePricing.objects.filter(
                branch=branch,
                service_id__in=service_ids,
                is_deleted=False,
            )
            .select_related("service")
            .order_by("service__code", "-valid_from")
        )
        branch_pricing_debug = [
            {
                "service_id": str(p.service_id),
                "service_code": getattr(p.service, "code", "") or "",
                "service_name": getattr(p.service, "name", "") or "",
            }
            for p in pricing_rows
        ]
        if _pricing_filter_ladder_debug_enabled():
            _bc = getattr(branch, "branch_code", "") or "—"
            logger.info(
                "Pricing match debug | branch=%s (%s) | required_tests=%s | branch_pricing=%s",
                str(branch.pk),
                _bc,
                json.dumps(required_tests_debug, default=str),
                json.dumps(branch_pricing_debug, default=str),
                extra={
                    "branch": str(branch.pk),
                    "branch_code": _bc,
                    "required_tests": required_tests_debug,
                    "branch_pricing": branch_pricing_debug,
                },
            )

        if any_pricing:
            er.append(ER_HAS_SERVICE_PRICING)

        if not pricings_used:
            max_tat = int(branch.report_delivery_hours or 24)
        elif max_tat == 0:
            max_tat = int(branch.report_delivery_hours or 24)

        supports_all = len(missing) == 0

        dist_km: float | None = None
        addr = getattr(branch, "address", None)
        if (
            location.latitude is not None
            and location.longitude is not None
            and addr
            and addr.latitude is not None
            and addr.longitude is not None
        ):
            try:
                dist_km = haversine_km(
                    location.latitude,
                    location.longitude,
                    float(addr.latitude),
                    float(addr.longitude),
                )
            except Exception:
                dist_km = None

        if mode == "home" and dist_km is not None and branch.home_collection_radius_km:
            if dist_km > float(branch.home_collection_radius_km):
                ir.append(IR_BEYOND_HOME_RADIUS)

        ir_set = set(ir)
        if mode == "home":
            home_collection_ok = (
                IR_HOME_COLLECTION_NOT_SUPPORTED not in ir_set and IR_BEYOND_HOME_RADIUS not in ir_set
            )
        else:
            home_collection_ok = True

        service_area_match = IR_OUTSIDE_SERVICE_AREA not in ir_set
        pricing_match = IR_MISSING_TEST_PRICING not in ir_set
        eligible = len(ir_set) == 0
        branch_code = getattr(branch, "branch_code", "") or ""

        logger.info(
            "Eligibility evaluation | branch=%s (%s) | service_area_match=%s | pricing_match=%s | "
            "home_collection=%s | eligible=%s | collection_mode=%s | ineligibility=%s",
            str(branch.pk),
            branch_code or "—",
            service_area_match,
            pricing_match,
            home_collection_ok,
            eligible,
            mode,
            sorted(ir_set) if ir_set else "[]",
            extra={
                "branch": str(branch.pk),
                "branch_code": branch_code,
                "service_area_match": service_area_match,
                "pricing_match": pricing_match,
                "home_collection": home_collection_ok,
                "eligible": eligible,
                "collection_mode": mode,
                "ineligibility_codes": sorted(ir_set),
            },
        )

        return EligibilityCandidate(
            lab=org,
            branch=branch,
            supports_all_tests=supports_all,
            supports_home_collection=bool(branch.home_collection_available and org.home_collection_available),
            distance_km=dist_km,
            estimated_price=price_sum if supports_all else None,
            estimated_tat_hours=max_tat if supports_all else None,
            missing_tests=missing,
            eligibility_reasons=sorted(set(er)),
            ineligibility_reasons=sorted(set(ir)),
        )

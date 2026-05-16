"""
Routing scenario debugging (read-only).

Simulates production eligibility via EligibilityEngine._evaluate_branch without creating
DiagnosticOrder rows. Returns structured dataclasses for CLI, tests, and future admin UI.

Operator manual: see plan debug_lab_routing_command (manage.py help debug_lab_routing).
"""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any

from django.db import connection
from django.db.models import Q
from django.db.models.functions import Trim
from django.test.utils import CaptureQueriesContext
from django.utils import timezone

from diagnostics_engine.choices.routing import RecommendationConfidence, RoutingLocationSource
from diagnostics_engine.models.catalog import DiagnosticServiceMaster
from diagnostics_engine.services.routing.eligibility_engine import (
    ER_IN_SERVICE_AREA,
    IR_BEYOND_HOME_RADIUS,
    IR_BRANCH_INACTIVE,
    IR_HOME_COLLECTION_NOT_SUPPORTED,
    IR_MISSING_TEST_PRICING,
    IR_ORG_NOT_ORDERABLE,
    IR_OUTSIDE_SERVICE_AREA,
    IR_WALK_IN_NOT_SUPPORTED,
    EligibilityCandidate,
    EligibilityEngine,
)
from diagnostics_engine.services.routing.routing_helpers import (
    ResolvedRoutingLocation,
    normalize_indian_pincode,
    routable_lab_branches_queryset,
)
from labs.choices.auth import RegistrationStatus
from labs.models.branch_pricing import BranchServiceArea, BranchServicePricing
from labs.models.lab_auth import LabBranch, LabOrganization


class FailureCode:
    """Operator-facing codes (mapped from production IR + marketplace gates)."""

    LAB_DISABLED = "LAB_DISABLED"
    SERVICE_DISABLED = "SERVICE_DISABLED"
    PINCODE_UNSUPPORTED = "PINCODE_UNSUPPORTED"
    HOME_COLLECTION_DISABLED = "HOME_COLLECTION_DISABLED"
    PRICE_MISSING = "PRICE_MISSING"
    TEST_NOT_SUPPORTED = "TEST_NOT_SUPPORTED"
    TEST_INACTIVE = "TEST_INACTIVE"


IR_TO_FAILURE: dict[str, str] = {
    IR_BRANCH_INACTIVE: FailureCode.LAB_DISABLED,
    IR_ORG_NOT_ORDERABLE: FailureCode.SERVICE_DISABLED,
    IR_OUTSIDE_SERVICE_AREA: FailureCode.PINCODE_UNSUPPORTED,
    IR_HOME_COLLECTION_NOT_SUPPORTED: FailureCode.HOME_COLLECTION_DISABLED,
    IR_WALK_IN_NOT_SUPPORTED: FailureCode.HOME_COLLECTION_DISABLED,
    IR_MISSING_TEST_PRICING: FailureCode.PRICE_MISSING,
    IR_BEYOND_HOME_RADIUS: FailureCode.HOME_COLLECTION_DISABLED,
}

FAILURE_PRIORITY: tuple[str, ...] = (
    FailureCode.LAB_DISABLED,
    FailureCode.SERVICE_DISABLED,
    FailureCode.TEST_INACTIVE,
    FailureCode.PINCODE_UNSUPPORTED,
    FailureCode.HOME_COLLECTION_DISABLED,
    FailureCode.PRICE_MISSING,
    FailureCode.TEST_NOT_SUPPORTED,
)


@dataclass(frozen=True)
class CheckResult:
    ok: bool
    label: str
    detail: str
    queryset_hint: str = ""


@dataclass
class PricingCheckResult:
    service_id: str
    service_code: str
    service_name: str
    strict_row_found: bool
    selling_price: Decimal | None
    rows_deleted_false: int
    rows_strict: int


@dataclass
class RoutingDebugResult:
    branch: LabBranch
    lab_display_name: str
    marketplace_ok: bool
    marketplace_blockers: list[str] = field(default_factory=list)
    eligible: bool = False
    primary_reason: str | None = None
    ineligibility_reasons: list[str] = field(default_factory=list)
    eligibility_reasons: list[str] = field(default_factory=list)
    missing_tests: list[dict[str, Any]] = field(default_factory=list)
    checks: list[CheckResult] = field(default_factory=list)
    inclusion_reasons: list[str] = field(default_factory=list)
    matched_area_pincode: str | None = None
    pricing_results: list[PricingCheckResult] = field(default_factory=list)
    evaluation_time_ms: float = 0.0
    candidate: EligibilityCandidate | None = None
    hypothetical_only: bool = False


@dataclass
class ScenarioReport:
    location: ResolvedRoutingLocation
    mode: str
    services: list[DiagnosticServiceMaster]
    branch_results: list[RoutingDebugResult]
    progressive_counts: dict[str, int]
    failure_breakdown: dict[str, int]
    total_sql_queries: int
    total_duration_ms: float
    queryset_catalog: dict[str, str] = field(default_factory=dict)


def lab_display_name(branch: LabBranch) -> str:
    org = branch.organization
    org_label = (org.display_name or org.organization_name or "").strip()
    branch_label = (branch.branch_name or "").strip()
    code = getattr(branch, "branch_code", "") or ""
    if org_label and branch_label:
        return f"{org_label} — {branch_label} ({code})"
    return f"{branch_label or org_label} ({code})".strip()


def resolve_catalog_services(test_tokens: list[str]) -> list[DiagnosticServiceMaster]:
    """Resolve --test values to active catalog rows (UUID, code, name, icontains)."""
    base = DiagnosticServiceMaster.objects.filter(is_active=True, deleted_at__isnull=True)
    resolved: list[DiagnosticServiceMaster] = []
    seen: set[Any] = set()

    for raw in test_tokens:
        token = raw.strip()
        if not token:
            continue

        svc: DiagnosticServiceMaster | None = None
        try:
            uid = uuid.UUID(token)
            svc = base.filter(pk=uid).first()
        except ValueError:
            pass

        if svc is None:
            svc = base.filter(code__iexact=token).first()
        if svc is None:
            svc = base.filter(name__iexact=token).first()
        if svc is None:
            matches = list(base.filter(name__icontains=token).order_by("code")[:10])
            if len(matches) == 1:
                svc = matches[0]
            elif len(matches) > 1:
                codes = ", ".join(f"{m.code!r}" for m in matches[:5])
                raise ValueError(
                    f"Ambiguous test {token!r}: multiple catalog names match. "
                    f"Use catalog code instead. Matches include: {codes}"
                )

        if svc is None:
            inactive = DiagnosticServiceMaster.objects.filter(
                Q(code__iexact=token) | Q(name__iexact=token)
            ).first()
            if inactive and (not inactive.is_active or inactive.deleted_at is not None):
                raise ValueError(f"Test {token!r} exists but is inactive or deleted (TEST_INACTIVE).")
            raise ValueError(f"Test not found in catalog: {token!r} (TEST_NOT_SUPPORTED).")

        if svc.pk not in seen:
            seen.add(svc.pk)
            resolved.append(svc)

    if not resolved:
        raise ValueError("At least one --test is required.")
    return resolved


def build_manual_location(*, pincode: str, city: str | None = None) -> ResolvedRoutingLocation:
    np = normalize_indian_pincode(pincode)
    if not np:
        raise ValueError(f"Invalid pincode: {pincode!r}")
    return ResolvedRoutingLocation(
        source=RoutingLocationSource.MANUAL,
        pincode=np,
        latitude=None,
        longitude=None,
        city=(city.strip() if city else None),
        confidence=RecommendationConfidence.MEDIUM,
    )


def marketplace_gate_blockers(branch: LabBranch) -> list[str]:
    """Why branch is excluded from routable_lab_branches_queryset (read-only checks)."""
    org: LabOrganization = branch.organization
    blockers: list[str] = []
    if branch.is_deleted:
        blockers.append("branch.is_deleted=True")
    if not branch.is_active:
        blockers.append("branch.is_active=False")
    if not branch.is_active_for_orders:
        blockers.append("branch.is_active_for_orders=False")
    if org.is_deleted:
        blockers.append("organization.is_deleted=True")
    if not org.is_active:
        blockers.append("organization.is_active=False")
    if org.registration_status != RegistrationStatus.APPROVED:
        blockers.append(f"organization.registration_status={org.registration_status!r} (need APPROVED)")
    if not org.is_active_for_orders:
        blockers.append("organization.is_active_for_orders=False")
    if not org.is_verified:
        blockers.append("organization.is_verified=False")
    if not org.onboarding_completed:
        blockers.append("organization.onboarding_completed=False")
    return blockers


def map_primary_reason(
    *,
    marketplace_ok: bool,
    ineligibility_reasons: list[str],
) -> str | None:
    if marketplace_ok and not ineligibility_reasons:
        return None
    codes: set[str] = set()
    if not marketplace_ok:
        codes.add(FailureCode.LAB_DISABLED)
    for ir in ineligibility_reasons:
        mapped = IR_TO_FAILURE.get(ir)
        if mapped:
            codes.add(mapped)
    for fc in FAILURE_PRIORITY:
        if fc in codes:
            return fc
    return FailureCode.LAB_DISABLED if not marketplace_ok else FailureCode.PRICE_MISSING


class LabRoutingScenarioDebugger:
    """Run hypothetical routing scenarios; no DB writes."""

    def check_lab_active(self, branch: LabBranch) -> CheckResult:
        blockers = marketplace_gate_blockers(branch)
        pool_ids = set(routable_lab_branches_queryset().values_list("pk", flat=True))
        in_pool = branch.pk in pool_ids
        if in_pool and not blockers:
            return CheckResult(
                ok=True,
                label="Active Lab / marketplace pool",
                detail="Branch passes routable_lab_branches_queryset filters.",
                queryset_hint="labs.models.lab_auth.LabBranch via routable_lab_branches_queryset()",
            )
        detail = "; ".join(blockers) if blockers else "Not in marketplace queryset."
        return CheckResult(
            ok=False,
            label="Active Lab / marketplace pool",
            detail=detail,
            queryset_hint="labs.models.lab_auth.LabBranch + LabOrganization marketplace gates",
        )

    def check_service_area(
        self, branch: LabBranch, location: ResolvedRoutingLocation
    ) -> tuple[CheckResult, BranchServiceArea | None]:
        areas_qs = BranchServiceArea.objects.filter(branch=branch, is_active=True, is_deleted=False)
        hint = "labs.models.branch_pricing.BranchServiceArea.filter(branch, is_active=True, is_deleted=False)"
        if not areas_qs.exists():
            return (
                CheckResult(
                    ok=True,
                    label="Service area",
                    detail="No service area rows — production default-allows pincode.",
                    queryset_hint=hint,
                ),
                None,
            )

        matched = None
        np = normalize_indian_pincode(location.pincode)
        if np:
            matched = areas_qs.annotate(_pc=Trim("pincode")).filter(_pc=np).first()
        if matched is None and location.city:
            matched = areas_qs.filter(city__iexact=location.city.strip()).first()

        if matched:
            return (
                CheckResult(
                    ok=True,
                    label="Service area",
                    detail=f"Matched pincode/city (area pincode={matched.pincode!r}).",
                    queryset_hint=hint + " + Trim(pincode) or city__iexact",
                ),
                matched,
            )
        return (
            CheckResult(
                ok=False,
                label="Service area",
                detail=f"No area for pincode {location.pincode!r}"
                + (f" or city {location.city!r}" if location.city else ""),
                queryset_hint=hint,
            ),
            None,
        )

    def check_home_collection(
        self,
        branch: LabBranch,
        mode: str,
        matched_area: BranchServiceArea | None,
    ) -> CheckResult:
        org = branch.organization
        if mode != "home":
            ok = branch.walk_in_collection_available
            return CheckResult(
                ok=ok,
                label="Walk-in collection",
                detail="walk_in_collection_available=True" if ok else "walk_in_collection_available=False",
                queryset_hint="LabBranch.walk_in_collection_available",
            )

        branch_ok = branch.home_collection_available
        org_ok = org.home_collection_available
        area_ok = matched_area is None or matched_area.is_home_collection_available
        ok = branch_ok and org_ok and area_ok
        parts = [
            f"branch.home_collection_available={branch_ok}",
            f"org.home_collection_available={org_ok}",
        ]
        if matched_area is not None:
            parts.append(f"area.is_home_collection_available={area_ok}")
        return CheckResult(
            ok=ok,
            label="Home collection",
            detail="; ".join(parts),
            queryset_hint="LabBranch + LabOrganization + BranchServiceArea",
        )

    def check_pricing(
        self,
        branch: LabBranch,
        services: list[DiagnosticServiceMaster],
        today: Any,
    ) -> tuple[CheckResult, list[PricingCheckResult]]:
        results: list[PricingCheckResult] = []
        all_ok = True
        missing_names: list[str] = []

        for svc in services:
            base = BranchServicePricing.objects.filter(
                branch=branch, service_id=svc.pk, is_deleted=False
            )
            n_any = base.count()
            strict_qs = base.filter(is_active=True, is_available=True, valid_from__lte=today).filter(
                Q(valid_to__isnull=True) | Q(valid_to__gte=today)
            )
            row = strict_qs.order_by("-valid_from").first()
            n_strict = strict_qs.count()
            results.append(
                PricingCheckResult(
                    service_id=str(svc.pk),
                    service_code=svc.code,
                    service_name=svc.name,
                    strict_row_found=row is not None,
                    selling_price=row.selling_price if row else None,
                    rows_deleted_false=n_any,
                    rows_strict=n_strict,
                )
            )
            if row is None:
                all_ok = False
                missing_names.append(svc.name or svc.code)

        if all_ok:
            return (
                CheckResult(
                    ok=True,
                    label="Pricing",
                    detail="Strict BranchServicePricing row for every requested test.",
                    queryset_hint="BranchServicePricing (is_active, is_available, valid window)",
                ),
                results,
            )
        return (
            CheckResult(
                ok=False,
                label="Pricing",
                detail="Missing strict pricing for: " + ", ".join(missing_names),
                queryset_hint="BranchServicePricing.service_id must match catalog UUID",
            ),
            results,
        )

    def build_inclusion_reasons(
        self,
        *,
        marketplace_ok: bool,
        area_check: CheckResult,
        home_check: CheckResult,
        pricing_check: CheckResult,
        mode: str,
    ) -> list[str]:
        reasons: list[str] = []
        if marketplace_ok:
            reasons.append(
                "in marketplace routing pool (org APPROVED, verified, onboarding complete, active for orders)"
            )
        if area_check.ok:
            reasons.append(area_check.detail)
        if home_check.ok:
            label = "home collection supported" if mode == "home" else "walk-in collection supported"
            reasons.append(label)
        if pricing_check.ok:
            reasons.append("strict pricing valid for all requested tests")
        return reasons

    def evaluate_branch_production(
        self,
        branch: LabBranch,
        service_ids: list[Any],
        location: ResolvedRoutingLocation,
        mode: str,
        required_tests_debug: list[dict[str, Any]],
    ) -> tuple[EligibilityCandidate, float]:
        today = timezone.now().date()
        t0 = time.perf_counter()
        candidate = EligibilityEngine._evaluate_branch(
            branch=branch,
            service_ids=service_ids,
            location=location,
            today=today,
            mode=mode,
            required_tests_debug=required_tests_debug,
        )
        ms = (time.perf_counter() - t0) * 1000.0
        return candidate, ms

    def debug_single_branch(
        self,
        branch: LabBranch,
        *,
        services: list[DiagnosticServiceMaster],
        location: ResolvedRoutingLocation,
        mode: str,
        required_tests_debug: list[dict[str, Any]],
    ) -> RoutingDebugResult:
        pool_ids = set(routable_lab_branches_queryset().values_list("pk", flat=True))
        marketplace_ok = branch.pk in pool_ids
        blockers = marketplace_gate_blockers(branch) if not marketplace_ok else []

        area_check, matched_area = self.check_service_area(branch, location)
        home_check = self.check_home_collection(branch, mode, matched_area)
        pricing_check, pricing_results = self.check_pricing(branch, services, timezone.now().date())
        active_check = self.check_lab_active(branch)

        candidate, eval_ms = self.evaluate_branch_production(
            branch, [s.pk for s in services], location, mode, required_tests_debug
        )

        ir = list(candidate.ineligibility_reasons)
        er = list(candidate.eligibility_reasons)
        eligible = marketplace_ok and not ir
        primary = map_primary_reason(marketplace_ok=marketplace_ok, ineligibility_reasons=ir)

        inclusion: list[str] = []
        if eligible:
            inclusion = self.build_inclusion_reasons(
                marketplace_ok=marketplace_ok,
                area_check=area_check,
                home_check=home_check,
                pricing_check=pricing_check,
                mode=mode,
            )

        checks = [active_check, area_check, home_check, pricing_check]

        return RoutingDebugResult(
            branch=branch,
            lab_display_name=lab_display_name(branch),
            marketplace_ok=marketplace_ok,
            marketplace_blockers=blockers,
            eligible=eligible,
            primary_reason=primary,
            ineligibility_reasons=ir,
            eligibility_reasons=er,
            missing_tests=list(candidate.missing_tests),
            checks=checks,
            inclusion_reasons=inclusion,
            matched_area_pincode=matched_area.pincode if matched_area else None,
            pricing_results=pricing_results,
            evaluation_time_ms=eval_ms,
            candidate=candidate,
            hypothetical_only=not marketplace_ok,
        )

    def build_queryset_catalog(
        self,
        *,
        sample_branch: LabBranch | None,
        service_ids: list[Any],
        today: Any,
    ) -> dict[str, str]:
        catalog: dict[str, str] = {
            "marketplace": str(routable_lab_branches_queryset().query),
        }
        if sample_branch and service_ids:
            np_hint = "416002"
            catalog["service_area"] = str(
                BranchServiceArea.objects.filter(
                    branch=sample_branch, is_active=True, is_deleted=False
                )
                .annotate(_pc=Trim("pincode"))
                .filter(_pc=np_hint)
                .query
            )
            sid = service_ids[0]
            catalog["pricing_strict"] = str(
                BranchServicePricing.objects.filter(
                    branch=sample_branch,
                    service_id=sid,
                    is_deleted=False,
                    is_active=True,
                    is_available=True,
                    valid_from__lte=today,
                )
                .filter(Q(valid_to__isnull=True) | Q(valid_to__gte=today))
                .query
            )
        return catalog

    def run_scenario(
        self,
        *,
        pincode: str,
        test_tokens: list[str],
        home_collection: bool,
        city: str | None = None,
        lab_id: str | None = None,
        marketplace_only: bool = False,
    ) -> ScenarioReport:
        location = build_manual_location(pincode=pincode, city=city)
        mode = "home" if home_collection else "lab"
        services = resolve_catalog_services(test_tokens)
        service_ids = [s.pk for s in services]
        required_tests_debug = [
            {"id": str(s.pk), "code": s.code, "name": s.name} for s in services
        ]

        branches_qs = LabBranch.objects.filter(is_deleted=False).select_related(
            "organization", "address"
        )
        if lab_id:
            try:
                uid = uuid.UUID(lab_id)
                branches_qs = branches_qs.filter(pk=uid)
            except ValueError:
                branches_qs = branches_qs.filter(branch_code=lab_id)
            if not branches_qs.exists():
                raise ValueError(f"Lab branch not found: {lab_id!r}")

        if marketplace_only:
            pool_pks = set(routable_lab_branches_queryset().values_list("pk", flat=True))
            branches_qs = branches_qs.filter(pk__in=pool_pks)

        t0 = time.perf_counter()
        with CaptureQueriesContext(connection) as ctx:
            branch_list = list(branches_qs.order_by("branch_code"))
            results = [
                self.debug_single_branch(
                    b,
                    services=services,
                    location=location,
                    mode=mode,
                    required_tests_debug=required_tests_debug,
                )
                for b in branch_list
            ]
        total_ms = (time.perf_counter() - t0) * 1000.0
        sql_count = len(ctx.captured_queries)

        progressive = self._progressive_counts(results)
        breakdown: dict[str, int] = {}
        for r in results:
            if r.eligible:
                continue
            reason = r.primary_reason or FailureCode.LAB_DISABLED
            breakdown[reason] = breakdown.get(reason, 0) + 1

        sample = branch_list[0] if branch_list else None
        catalog = self.build_queryset_catalog(
            sample_branch=sample,
            service_ids=service_ids,
            today=timezone.now().date(),
        )

        return ScenarioReport(
            location=location,
            mode=mode,
            services=services,
            branch_results=results,
            progressive_counts=progressive,
            failure_breakdown=breakdown,
            total_sql_queries=sql_count,
            total_duration_ms=total_ms,
            queryset_catalog=catalog,
        )

    @staticmethod
    def _progressive_counts(results: list[RoutingDebugResult]) -> dict[str, int]:
        total = len(results)
        marketplace = sum(1 for r in results if r.marketplace_ok)
        pincode = sum(1 for r in results if any(c.label == "Service area" and c.ok for c in r.checks))
        home = sum(
            1
            for r in results
            if any(
                c.label in ("Home collection", "Walk-in collection") and c.ok for c in r.checks
            )
        )
        pricing = sum(1 for r in results if any(c.label == "Pricing" and c.ok for c in r.checks))
        eligible = sum(1 for r in results if r.eligible)
        return {
            "all_branches": total,
            "marketplace_pool": marketplace,
            "pincode_matched": pincode,
            "home_collection_ok": home,
            "strict_pricing_all_tests": pricing,
            "final_eligible": eligible,
        }


def verbose_ir_payload(result: RoutingDebugResult) -> dict[str, Any]:
    missing_ids = [m.get("service_id") for m in result.missing_tests if m.get("service_id")]
    return {
        "branch_id": str(result.branch.pk),
        "branch_code": getattr(result.branch, "branch_code", "") or "",
        "marketplace_ok": result.marketplace_ok,
        "marketplace_blockers": result.marketplace_blockers,
        "eligible": result.eligible,
        "primary_reason": result.primary_reason,
        "ineligibility_reasons": result.ineligibility_reasons,
        "eligibility_reasons": result.eligibility_reasons,
        "missing_service_ids": missing_ids,
        "missing_tests": result.missing_tests,
        "pricing_checked": True,
        "evaluation_time_ms": round(result.evaluation_time_ms, 2),
        "hypothetical_only": result.hypothetical_only,
    }

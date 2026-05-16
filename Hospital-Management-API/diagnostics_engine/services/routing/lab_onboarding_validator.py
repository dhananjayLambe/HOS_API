"""
Lab onboarding readiness validation (read-only).

Orchestrates organization/branch checks and production routing eligibility
without duplicating business rules from EligibilityEngine or routable_lab_branches_queryset.

Operator manual: docs/backend/Hospital-Management-API/VALIDATE_LAB_ONBOARDING_OPERATOR_MANUAL.md
CLI: python manage.py validate_lab_onboarding
"""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Any

from django.db.models import Q
from django.utils import timezone

from diagnostics_engine.models.catalog import DiagnosticServiceMaster
from diagnostics_engine.services.routing.eligibility_engine import (
    IR_BEYOND_HOME_RADIUS,
    IR_BRANCH_INACTIVE,
    IR_HOME_COLLECTION_NOT_SUPPORTED,
    IR_MISSING_TEST_PRICING,
    IR_ORG_NOT_ORDERABLE,
    IR_OUTSIDE_SERVICE_AREA,
    IR_WALK_IN_NOT_SUPPORTED,
    EligibilityCandidate,
)
from diagnostics_engine.services.routing.routing_debug import (
    LabRoutingScenarioDebugger,
    PricingCheckResult,
    build_manual_location,
    lab_display_name,
    marketplace_gate_blockers,
    resolve_catalog_services,
)
from diagnostics_engine.services.routing.routing_helpers import (
    ResolvedRoutingLocation,
    routable_lab_branches_queryset,
)
from labs.choices.auth import RegistrationStatus
from labs.models.branch_pricing import BranchServiceArea, BranchServicePricing
from labs.models.lab_auth import LabBranch, LabOrganization

# Standardized onboarding failure codes (operator / CI)
ORG_NOT_APPROVED = "ORG_NOT_APPROVED"
ORG_NOT_VERIFIED = "ORG_NOT_VERIFIED"
ORG_INACTIVE = "ORG_INACTIVE"
BRANCH_DISABLED = "BRANCH_DISABLED"
BRANCH_DELETED = "BRANCH_DELETED"
MARKETPLACE_INELIGIBLE = "MARKETPLACE_INELIGIBLE"
PINCODE_UNSUPPORTED = "PINCODE_UNSUPPORTED"
HOME_COLLECTION_DISABLED = "HOME_COLLECTION_DISABLED"
TEST_INACTIVE = "TEST_INACTIVE"
PRICE_MISSING = "PRICE_MISSING"
ROUTING_REJECTED = "ROUTING_REJECTED"

ONBOARDING_FAILURE_CODES: tuple[str, ...] = (
    ORG_NOT_APPROVED,
    ORG_NOT_VERIFIED,
    ORG_INACTIVE,
    BRANCH_DISABLED,
    BRANCH_DELETED,
    MARKETPLACE_INELIGIBLE,
    PINCODE_UNSUPPORTED,
    HOME_COLLECTION_DISABLED,
    TEST_INACTIVE,
    PRICE_MISSING,
    ROUTING_REJECTED,
)

IR_TO_ONBOARDING: dict[str, str] = {
    IR_BRANCH_INACTIVE: BRANCH_DISABLED,
    IR_ORG_NOT_ORDERABLE: ORG_INACTIVE,
    IR_OUTSIDE_SERVICE_AREA: PINCODE_UNSUPPORTED,
    IR_HOME_COLLECTION_NOT_SUPPORTED: HOME_COLLECTION_DISABLED,
    IR_WALK_IN_NOT_SUPPORTED: HOME_COLLECTION_DISABLED,
    IR_MISSING_TEST_PRICING: PRICE_MISSING,
    IR_BEYOND_HOME_RADIUS: HOME_COLLECTION_DISABLED,
}

SECTION_KEYS = (
    "organization",
    "branch",
    "marketplace",
    "service_area",
    "home_collection",
    "test_catalog",
    "pricing",
    "routing_eligibility",
)


@dataclass(frozen=True)
class SectionResult:
    passed: bool
    lines: list[str]
    failure_codes: list[str] = field(default_factory=list)


@dataclass
class LabOnboardingReport:
    branch: LabBranch
    location: ResolvedRoutingLocation
    mode: str
    services: list[DiagnosticServiceMaster]
    sections: dict[str, SectionResult]
    routing_candidate: EligibilityCandidate | None
    routing_eval_ms: float
    marketplace_ok: bool
    marketplace_blockers: list[str]
    matched_area: BranchServiceArea | None
    pricing_results: list[PricingCheckResult]
    failure_codes: list[str]
    checks: dict[str, bool]
    ready: bool
    total_duration_ms: float
    verbose: dict[str, Any] = field(default_factory=dict)
    queryset_catalog: dict[str, str] = field(default_factory=dict)


def map_ir_to_onboarding(ir_codes: list[str]) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for ir in ir_codes:
        code = IR_TO_ONBOARDING.get(ir)
        if code and code not in seen:
            seen.add(code)
            out.append(code)
    return out


def _dedupe_failure_codes(codes: list[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for fc in ONBOARDING_FAILURE_CODES:
        if fc in codes and fc not in seen:
            seen.add(fc)
            ordered.append(fc)
    for fc in codes:
        if fc not in seen:
            seen.add(fc)
            ordered.append(fc)
    return ordered


class LabOnboardingValidator:
    """Validate lab branch onboarding and production routing readiness (read-only)."""

    def __init__(
        self,
        *,
        lab_id: str,
        pincode: str,
        test_tokens: list[str],
        home_collection: bool = False,
        city: str | None = None,
        verbose: bool = False,
        show_sql: bool = False,
    ) -> None:
        self.lab_id = lab_id.strip()
        self.pincode = pincode
        self.test_tokens = test_tokens
        self.home_collection = home_collection
        self.city = city
        self.verbose = verbose
        self.show_sql = show_sql
        self.mode = "home" if home_collection else "lab"
        self._debugger = LabRoutingScenarioDebugger()
        self._branch: LabBranch | None = None
        self._location: ResolvedRoutingLocation | None = None
        self._services: list[DiagnosticServiceMaster] = []
        self._marketplace_ok = False
        self._marketplace_blockers: list[str] = []
        self._matched_area: BranchServiceArea | None = None
        self._pricing_results: list[PricingCheckResult] = []
        self._routing_candidate: EligibilityCandidate | None = None
        self._routing_eval_ms = 0.0
        self._sections: dict[str, SectionResult] = {}

    def _resolve_branch(self) -> LabBranch:
        qs = LabBranch.objects.filter(is_deleted=False).select_related(
            "organization", "address"
        )
        try:
            uid = uuid.UUID(self.lab_id)
            qs = qs.filter(pk=uid)
        except ValueError:
            qs = qs.filter(branch_code=self.lab_id)
        branch = qs.first()
        if branch is None:
            raise ValueError(f"Lab branch not found: {self.lab_id!r}")
        return branch

    def validate_organization(self, branch: LabBranch) -> SectionResult:
        org: LabOrganization = branch.organization
        lines: list[str] = []
        codes: list[str] = []

        if org.is_deleted or not org.is_active:
            lines.append("✗ Organization inactive or deleted")
            codes.append(ORG_INACTIVE)
        else:
            lines.append("✓ Organization active")

        if org.registration_status != RegistrationStatus.APPROVED:
            lines.append(
                f"✗ Organization not approved (status={org.registration_status!r})"
            )
            codes.append(ORG_NOT_APPROVED)
        else:
            lines.append("✓ Organization approved")

        if not org.is_verified:
            lines.append("✗ Organization not verified")
            codes.append(ORG_NOT_VERIFIED)
        else:
            lines.append("✓ Organization verified")

        if not org.onboarding_completed:
            lines.append("✗ Organization onboarding not completed")
            codes.append(ORG_NOT_APPROVED)
        else:
            lines.append("✓ Organization onboarding completed")

        if not org.is_active_for_orders:
            lines.append("✗ Organization not active for orders")
            codes.append(ORG_INACTIVE)
        else:
            lines.append("✓ Organization active for orders")

        passed = not codes
        return SectionResult(passed=passed, lines=lines, failure_codes=codes)

    def validate_branch(self, branch: LabBranch) -> SectionResult:
        org: LabOrganization = branch.organization
        lines: list[str] = []
        codes: list[str] = []

        if branch.is_deleted:
            lines.append("✗ Branch deleted")
            codes.append(BRANCH_DELETED)
        else:
            lines.append("✓ Branch not deleted")

        if not branch.is_active:
            lines.append("✗ Branch inactive")
            codes.append(BRANCH_DISABLED)
        else:
            lines.append("✓ Branch active")

        code = (branch.branch_code or "").strip()
        if not code:
            lines.append("✗ Branch code missing")
            codes.append(BRANCH_DISABLED)
        else:
            lines.append(f"✓ Branch code present ({code})")

        if not branch.is_active_for_orders:
            lines.append("✗ Branch not enabled for orders")
            codes.append(BRANCH_DISABLED)
        else:
            lines.append("✓ Branch enabled for orders")

        if not org.onboarding_completed:
            lines.append("✗ Organization onboarding not completed (branch gate)")
            if ORG_NOT_APPROVED not in codes:
                codes.append(ORG_NOT_APPROVED)
        else:
            lines.append("✓ Organization onboarding completed")

        passed = not codes
        return SectionResult(passed=passed, lines=lines, failure_codes=codes)

    def validate_marketplace_eligibility(self, branch: LabBranch) -> SectionResult:
        pool_ids = set(routable_lab_branches_queryset().values_list("pk", flat=True))
        in_pool = branch.pk in pool_ids
        blockers = marketplace_gate_blockers(branch) if not in_pool else []
        self._marketplace_ok = in_pool
        self._marketplace_blockers = blockers

        lines: list[str] = []
        codes: list[str] = []

        if in_pool:
            lines.append("✓ In marketplace routing pool")
        else:
            lines.append("✗ Not in marketplace pool")
            codes.append(MARKETPLACE_INELIGIBLE)
            if blockers:
                lines.append("Failed conditions:")
                for b in blockers:
                    lines.append(f"  * {b}")

        passed = in_pool
        return SectionResult(passed=passed, lines=lines, failure_codes=codes)

    def validate_service_area(
        self,
        branch: LabBranch,
        location: ResolvedRoutingLocation,
    ) -> SectionResult:
        areas_qs = BranchServiceArea.objects.filter(
            branch=branch, is_active=True, is_deleted=False
        )
        total = areas_qs.count()
        area_check, matched = self._debugger.check_service_area(branch, location)
        self._matched_area = matched

        lines: list[str] = [f"Total configured pincodes: {total}"]
        codes: list[str] = []

        if matched:
            lines.append(f"✓ Pincode {location.pincode!r} configured")
            lines.append(f"  Matched area pincode={matched.pincode!r} city={matched.city!r}")
            lines.append("✓ Service area active")
            if matched.is_home_collection_available:
                lines.append("✓ Home collection supported on matched area")
            else:
                lines.append("✗ Home collection not supported on matched area")
        elif total == 0:
            lines.append(
                "✓ No service area rows — production default-allows pincode"
            )
        else:
            lines.append(f"✗ Pincode {location.pincode!r} not in service area")
            codes.append(PINCODE_UNSUPPORTED)

        if not area_check.ok and total > 0:
            if PINCODE_UNSUPPORTED not in codes:
                codes.append(PINCODE_UNSUPPORTED)

        passed = area_check.ok
        return SectionResult(passed=passed, lines=lines, failure_codes=codes)

    def validate_home_collection(
        self,
        branch: LabBranch,
        mode: str,
        matched_area: BranchServiceArea | None,
    ) -> SectionResult:
        if mode != "home":
            check = self._debugger.check_home_collection(branch, mode, matched_area)
            return SectionResult(
                passed=check.ok,
                lines=[f"✓ {check.label}: {check.detail}" if check.ok else f"✗ {check.label}: {check.detail}"],
                failure_codes=[],
            )

        check = self._debugger.check_home_collection(branch, mode, matched_area)
        lines = [
            f"{'✓' if check.ok else '✗'} {check.label}: {check.detail}",
        ]
        codes = [] if check.ok else [HOME_COLLECTION_DISABLED]
        return SectionResult(passed=check.ok, lines=lines, failure_codes=codes)

    def validate_test_catalog(self, test_tokens: list[str]) -> tuple[SectionResult, list[DiagnosticServiceMaster]]:
        try:
            services = resolve_catalog_services(test_tokens)
        except ValueError as exc:
            msg = str(exc)
            if "TEST_INACTIVE" in msg:
                return (
                    SectionResult(
                        passed=False,
                        lines=[f"✗ {msg}"],
                        failure_codes=[TEST_INACTIVE],
                    ),
                    [],
                )
            raise

        lines: list[str] = []
        for svc in services:
            lines.append(
                f"✓ {svc.name!r}  code={svc.code!r}  id={svc.pk}"
            )
        return (
            SectionResult(passed=True, lines=lines, failure_codes=[]),
            services,
        )

    def validate_pricing(
        self,
        branch: LabBranch,
        services: list[DiagnosticServiceMaster],
    ) -> SectionResult:
        today = timezone.now().date()
        check, results = self._debugger.check_pricing(branch, services, today)
        self._pricing_results = results

        lines: list[str] = []
        codes: list[str] = []
        for pr in results:
            if pr.strict_row_found:
                mrp_part = ""
                row = (
                    BranchServicePricing.objects.filter(
                        branch=branch,
                        service_id=pr.service_id,
                        is_deleted=False,
                        is_active=True,
                        is_available=True,
                        valid_from__lte=today,
                    )
                    .filter(Q(valid_to__isnull=True) | Q(valid_to__gte=today))
                    .order_by("-valid_from")
                    .first()
                )
                if row and row.mrp is not None:
                    mrp_part = f"  mrp={row.mrp}"
                lines.append(
                    f"✓ {pr.service_name} ({pr.service_code}) pricing configured  "
                    f"selling_price={pr.selling_price}{mrp_part}"
                )
            else:
                lines.append(
                    f"✗ Missing pricing for {pr.service_name} ({pr.service_code})"
                )
                codes.append(PRICE_MISSING)

        if not check.ok and PRICE_MISSING not in codes:
            codes.append(PRICE_MISSING)

        return SectionResult(passed=check.ok, lines=lines, failure_codes=codes)

    def validate_routing_eligibility(
        self,
        branch: LabBranch,
        services: list[DiagnosticServiceMaster],
        location: ResolvedRoutingLocation,
        mode: str,
    ) -> SectionResult:
        required_tests_debug = [
            {"id": str(s.pk), "code": s.code, "name": s.name} for s in services
        ]
        candidate, eval_ms = self._debugger.evaluate_branch_production(
            branch,
            [s.pk for s in services],
            location,
            mode,
            required_tests_debug,
        )
        self._routing_candidate = candidate
        self._routing_eval_ms = eval_ms

        lines: list[str] = [
            f"Routing mode: {mode!r}",
            f"Evaluation time: {eval_ms:.1f}ms",
        ]
        codes: list[str] = []

        if candidate.ineligibility_reasons:
            lines.append("✗ Routing ineligible")
            lines.append("Ineligibility reasons (production IR):")
            for ir in candidate.ineligibility_reasons:
                lines.append(f"  * {ir}")
            mapped = map_ir_to_onboarding(list(candidate.ineligibility_reasons))
            codes.extend(mapped)
            if self._marketplace_ok and mapped and ROUTING_REJECTED not in codes:
                codes.append(ROUTING_REJECTED)
        else:
            lines.append("✓ Routing eligible (production)")

        if candidate.eligibility_reasons:
            lines.append("Eligibility reasons (production ER):")
            for er in candidate.eligibility_reasons:
                lines.append(f"  * {er}")

        if candidate.missing_tests:
            lines.append("Missing tests:")
            for mt in candidate.missing_tests:
                lines.append(f"  * {mt}")

        ir_blocked = bool(candidate.ineligibility_reasons)
        passed = self._marketplace_ok and not ir_blocked
        return SectionResult(passed=passed, lines=lines, failure_codes=codes)

    def generate_summary(
        self,
        sections: dict[str, SectionResult],
        *,
        marketplace_ok: bool,
        routing_candidate: EligibilityCandidate | None,
    ) -> tuple[list[str], dict[str, bool], bool]:
        all_codes: list[str] = []
        checks: dict[str, bool] = {}
        for key in SECTION_KEYS:
            sec = sections.get(key)
            if sec is None:
                if key == "home_collection" and self.mode != "home":
                    checks[key] = True
                    continue
                checks[key] = False
                continue
            checks[key] = sec.passed
            all_codes.extend(sec.failure_codes)

        ir_blocked = bool(
            routing_candidate and routing_candidate.ineligibility_reasons
        )
        ready = (
            all(checks.get(k, False) for k in SECTION_KEYS)
            and marketplace_ok
            and not ir_blocked
        )
        failure_codes = _dedupe_failure_codes(all_codes)
        return failure_codes, checks, ready

    def run(self) -> LabOnboardingReport:
        t0 = time.perf_counter()
        branch = self._resolve_branch()
        self._branch = branch
        location = build_manual_location(pincode=self.pincode, city=self.city)
        self._location = location

        catalog_section, services = self.validate_test_catalog(self.test_tokens)
        if not services:
            self._sections["test_catalog"] = catalog_section
            failure_codes = _dedupe_failure_codes(catalog_section.failure_codes)
            checks = {k: False for k in SECTION_KEYS}
            checks["test_catalog"] = catalog_section.passed
            return LabOnboardingReport(
                branch=branch,
                location=location,
                mode=self.mode,
                services=[],
                sections=self._sections,
                routing_candidate=None,
                routing_eval_ms=0.0,
                marketplace_ok=False,
                marketplace_blockers=[],
                matched_area=None,
                pricing_results=[],
                failure_codes=failure_codes,
                checks=checks,
                ready=False,
                total_duration_ms=(time.perf_counter() - t0) * 1000.0,
            )

        self._services = services
        self._sections["organization"] = self.validate_organization(branch)
        self._sections["branch"] = self.validate_branch(branch)
        self._sections["marketplace"] = self.validate_marketplace_eligibility(branch)
        self._sections["service_area"] = self.validate_service_area(branch, location)
        self._sections["home_collection"] = self.validate_home_collection(
            branch, self.mode, self._matched_area
        )
        self._sections["test_catalog"] = catalog_section
        self._sections["pricing"] = self.validate_pricing(branch, services)
        self._sections["routing_eligibility"] = self.validate_routing_eligibility(
            branch, services, location, self.mode
        )

        failure_codes, checks, ready = self.generate_summary(
            self._sections,
            marketplace_ok=self._marketplace_ok,
            routing_candidate=self._routing_candidate,
        )

        queryset_catalog: dict[str, str] = {}
        if self.show_sql:
            queryset_catalog = self._debugger.build_queryset_catalog(
                sample_branch=branch,
                service_ids=[s.pk for s in services],
                today=timezone.now().date(),
            )

        verbose: dict[str, Any] = {}
        if self.verbose:
            pool_count = routable_lab_branches_queryset().count()
            verbose = {
                "marketplace_pool_count": pool_count,
                "marketplace_ok": self._marketplace_ok,
                "marketplace_blockers": self._marketplace_blockers,
                "routing_eval_ms": self._routing_eval_ms,
                "ineligibility_reasons": list(
                    self._routing_candidate.ineligibility_reasons
                )
                if self._routing_candidate
                else [],
                "eligibility_reasons": list(
                    self._routing_candidate.eligibility_reasons
                )
                if self._routing_candidate
                else [],
            }

        return LabOnboardingReport(
            branch=branch,
            location=location,
            mode=self.mode,
            services=services,
            sections=self._sections,
            routing_candidate=self._routing_candidate,
            routing_eval_ms=self._routing_eval_ms,
            marketplace_ok=self._marketplace_ok,
            marketplace_blockers=self._marketplace_blockers,
            matched_area=self._matched_area,
            pricing_results=self._pricing_results,
            failure_codes=failure_codes,
            checks=checks,
            ready=ready,
            total_duration_ms=(time.perf_counter() - t0) * 1000.0,
            verbose=verbose,
            queryset_catalog=queryset_catalog,
        )

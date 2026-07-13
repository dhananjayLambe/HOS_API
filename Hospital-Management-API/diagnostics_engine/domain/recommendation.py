"""Read-only laboratory recommendation orchestration (Milestone 2)."""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any
from uuid import UUID

from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone

from consultations_core.models.consultation import Consultation
from consultations_core.models.investigation import InvestigationSource
from diagnostics_engine.domain.investigation_resolution import (
    build_expanded_test_summaries,
    build_package_summaries,
    derive_sample_collection_mode,
    extract_required_service_ids,
    load_convertible_investigation_items,
)
from diagnostics_engine.domain.pricing import PricingQuoteService
from diagnostics_engine.services.routing.eligibility_engine import EligibilityEngine
from diagnostics_engine.services.routing.ranking_engine import RankingEngine
from diagnostics_engine.services.routing.routing_helpers import (
    ResolvedRoutingLocation,
    resolve_routing_location_for_context,
)

if TYPE_CHECKING:
    from consultations_core.models.encounter import ClinicalEncounter
    from labs.models.lab_auth import LabBranch, LabOrganization
    from patient_account.models import PatientProfile

logger = logging.getLogger(__name__)


class RecommendationFailureReason:
    NO_CONSULTATION = "NO_CONSULTATION"
    NO_ENCOUNTER = "NO_ENCOUNTER"
    NO_INVESTIGATIONS = "NO_INVESTIGATIONS"
    ONLY_CUSTOM_INVESTIGATIONS = "ONLY_CUSTOM_INVESTIGATIONS"
    NO_ELIGIBLE_LABORATORY = "NO_ELIGIBLE_LABORATORY"
    PRICING_FAILURE = "PRICING_FAILURE"
    LOCATION_MISSING = "LOCATION_MISSING"
    VALIDATION_ERROR = "VALIDATION_ERROR"


@dataclass(frozen=True)
class ExpandedTestLine:
    service_id: str
    code: str
    name: str
    quantity: int
    investigation_item_id: str
    package_id: str | None = None


@dataclass(frozen=True)
class PackageSummary:
    investigation_item_id: str
    package_id: str
    name: str
    code: str


@dataclass(frozen=True)
class RecommendationResult:
    available: bool
    failure_reason: str | None
    consultation_id: UUID
    recommended_lab: LabOrganization | None
    recommended_branch: LabBranch | None
    collection_mode: str
    expanded_tests: list[ExpandedTestLine] = field(default_factory=list)
    packages: list[PackageSummary] = field(default_factory=list)
    routing_estimated_price: Decimal | None = None
    quoted_price: Decimal | None = None
    mrp_total: Decimal | None = None
    savings: Decimal | None = None
    pricing_source: str = "service_sum"
    estimated_tat_hours: int | None = None
    estimated_distance_km: float | None = None
    routing_score: Decimal | None = None
    ranking_labels: list[str] = field(default_factory=list)
    generated_at: datetime = field(default_factory=timezone.now)
    duration_ms: int = 0


def _log_started(consultation_id: UUID, service_count: int, collection_mode: str) -> None:
    logger.info(
        "recommendation.started consultation_id=%s service_count=%s collection_mode=%s",
        consultation_id,
        service_count,
        collection_mode,
    )


def _log_completed(
    consultation_id: UUID,
    branch_id: Any,
    routing_estimated_price: Decimal | None,
    duration_ms: int,
    ranking_labels: list[str],
) -> None:
    logger.info(
        "recommendation.completed consultation_id=%s branch_id=%s routing_estimated_price=%s "
        "duration_ms=%s ranking_labels=%s",
        consultation_id,
        branch_id,
        routing_estimated_price,
        duration_ms,
        ",".join(ranking_labels),
    )


def _log_failed(consultation_id: UUID, failure_reason: str, duration_ms: int) -> None:
    logger.info(
        "recommendation.failed consultation_id=%s failure_reason=%s duration_ms=%s",
        consultation_id,
        failure_reason,
        duration_ms,
    )


def _failure(
    *,
    consultation_id: UUID,
    reason: str,
    collection_mode: str = "lab",
    started: float,
    expanded_tests: list[ExpandedTestLine] | None = None,
    packages: list[PackageSummary] | None = None,
) -> RecommendationResult:
    duration_ms = int((time.monotonic() - started) * 1000)
    _log_failed(consultation_id, reason, duration_ms)
    return RecommendationResult(
        available=False,
        failure_reason=reason,
        consultation_id=consultation_id,
        recommended_lab=None,
        recommended_branch=None,
        collection_mode=collection_mode,
        expanded_tests=expanded_tests or [],
        packages=packages or [],
        generated_at=timezone.now(),
        duration_ms=duration_ms,
    )


def _map_validation_error(exc: ValidationError) -> str:
    msg = "; ".join(exc.messages) if hasattr(exc, "messages") else str(exc)
    lower = msg.lower()
    if "only custom" in lower or "custom investigations" in lower:
        return RecommendationFailureReason.ONLY_CUSTOM_INVESTIGATIONS
    if "no active" in lower and "investigation" in lower:
        return RecommendationFailureReason.NO_INVESTIGATIONS
    return RecommendationFailureReason.VALIDATION_ERROR


def _location_is_missing(location: ResolvedRoutingLocation) -> bool:
    return not location.pincode and not location.city and location.latitude is None


def _marketplace_mrp_markup_factor() -> Decimal:
    """Display MRP markup over DoctorPro (selling) price — default 15%."""
    pct = Decimal(str(getattr(settings, "MARKETPLACE_DISPLAY_MRP_MARKUP_PERCENT", 15)))
    return Decimal("1") + (pct / Decimal("100"))


def _line_display_mrp(*, selling_price: Decimal, catalog_mrp: Decimal | None = None) -> Decimal:
    """
    Patient-facing MRP for marketplace / WhatsApp.

    DoctorPro Price = selling_price. When branch catalog has a higher package MRP, use it;
    otherwise MRP = selling_price + markup (default 15%).
    """
    computed = (selling_price * _marketplace_mrp_markup_factor()).quantize(Decimal("0.01"))
    if catalog_mrp is not None and catalog_mrp > selling_price:
        return catalog_mrp.quantize(Decimal("0.01"))
    return computed


def _quote_investigations_at_branch(
    investigations: list,
    branch: LabBranch,
) -> tuple[Decimal, Decimal, str]:
    total = Decimal("0.00")
    mrp_total = Decimal("0.00")
    has_package_sku = False
    has_derived = False
    for inv in investigations:
        if inv.source == InvestigationSource.CATALOG:
            quote = PricingQuoteService.quote_service_line(branch, inv.catalog_item)
            selling = quote["selling_price"]
            total += selling
            mrp_total += _line_display_mrp(selling_price=selling)
        elif inv.source == InvestigationSource.PACKAGE:
            quote = PricingQuoteService.quote_package_line(branch, inv.diagnostic_package)
            selling = quote["selling_price"]
            total += selling
            mrp_total += _line_display_mrp(
                selling_price=selling,
                catalog_mrp=quote.get("mrp"),
            )
            if quote.get("branch_package_pricing_id"):
                has_package_sku = True
            if quote.get("is_price_derived"):
                has_derived = True
    if has_derived:
        source = "derived"
    elif has_package_sku:
        source = "mixed_sku"
    else:
        source = "service_sum"
    return total, mrp_total, source


def _compute_savings(*, mrp_total: Decimal, quoted_price: Decimal) -> Decimal:
    delta = mrp_total - quoted_price
    return delta if delta > Decimal("0") else Decimal("0")


class LabRecommendationService:
    """Thin read-only orchestrator over existing eligibility, ranking, and pricing engines."""

    @classmethod
    def recommend(
        cls,
        *,
        consultation: Consultation,
        encounter: ClinicalEncounter | None = None,
        branch: LabBranch | None = None,
        patient_profile: PatientProfile | None = None,
        location_override: ResolvedRoutingLocation | None = None,
    ) -> RecommendationResult:
        started = time.monotonic()
        if not consultation or not consultation.pk:
            return _failure(
                consultation_id=getattr(consultation, "pk", UUID(int=0)),
                reason=RecommendationFailureReason.NO_CONSULTATION,
                started=started,
            )

        consultation_id = consultation.pk
        enc = encounter or consultation.encounter
        if enc is None:
            return _failure(
                consultation_id=consultation_id,
                reason=RecommendationFailureReason.NO_ENCOUNTER,
                started=started,
            )

        profile = patient_profile or enc.patient_profile

        try:
            investigations = load_convertible_investigation_items(consultation)
        except ValidationError as exc:
            return _failure(
                consultation_id=consultation_id,
                reason=_map_validation_error(exc),
                started=started,
            )

        expanded_raw = build_expanded_test_summaries(investigations)
        packages_raw = build_package_summaries(investigations)
        expanded_tests = [
            ExpandedTestLine(
                service_id=r["service_id"],
                code=r["code"],
                name=r["name"],
                quantity=r["quantity"],
                investigation_item_id=r["investigation_item_id"],
                package_id=r.get("package_id"),
            )
            for r in expanded_raw
        ]
        packages = [
            PackageSummary(
                investigation_item_id=p["investigation_item_id"],
                package_id=p["package_id"],
                name=p["name"],
                code=p["code"],
            )
            for p in packages_raw
        ]

        service_ids = extract_required_service_ids(investigations)
        collection_mode = derive_sample_collection_mode(investigations, branch=branch)

        _log_started(consultation_id, len(service_ids), collection_mode)

        if location_override is not None:
            location = location_override
        else:
            location = resolve_routing_location_for_context(
                encounter=enc,
                patient_profile=profile,
                collection_mode=collection_mode,
            )

        if _location_is_missing(location):
            return _failure(
                consultation_id=consultation_id,
                reason=RecommendationFailureReason.LOCATION_MISSING,
                collection_mode=collection_mode,
                started=started,
                expanded_tests=expanded_tests,
                packages=packages,
            )

        eval_started = time.monotonic()
        candidates = EligibilityEngine.evaluate_requirements(
            service_ids=service_ids,
            location=location,
            mode=collection_mode,
        )
        evaluation_time_ms = int((time.monotonic() - eval_started) * 1000)
        eligible = [c for c in candidates if not c.ineligibility_reasons]
        if not eligible:
            from business_audit.decision.routing.hooks import schedule_marketplace_routing_decision

            schedule_marketplace_routing_decision(
                recommendation_id=str(consultation_id),
                collection_mode=collection_mode,
                all_evaluated=candidates,
                ranked=[],
                confidence=location.confidence,
                assigned=False,
                returned_count=len(candidates),
                filtered_count=len(candidates),
                evaluation_time_ms=evaluation_time_ms,
                routing_time_ms=int((time.monotonic() - started) * 1000),
                failure_reason=RecommendationFailureReason.NO_ELIGIBLE_LABORATORY,
                organization_id=str(enc.clinic_id),
            )
            return _failure(
                consultation_id=consultation_id,
                reason=RecommendationFailureReason.NO_ELIGIBLE_LABORATORY,
                collection_mode=collection_mode,
                started=started,
                expanded_tests=expanded_tests,
                packages=packages,
            )

        rank_started = time.monotonic()
        ranked = RankingEngine.rank(eligible)
        comparison_time_ms = int((time.monotonic() - rank_started) * 1000)
        if not ranked:
            from business_audit.decision.routing.hooks import schedule_marketplace_routing_decision

            schedule_marketplace_routing_decision(
                recommendation_id=str(consultation_id),
                collection_mode=collection_mode,
                all_evaluated=candidates,
                ranked=[],
                confidence=location.confidence,
                assigned=False,
                returned_count=len(candidates),
                filtered_count=len(candidates) - len(eligible),
                evaluation_time_ms=evaluation_time_ms,
                comparison_time_ms=comparison_time_ms,
                routing_time_ms=int((time.monotonic() - started) * 1000),
                failure_reason=RecommendationFailureReason.NO_ELIGIBLE_LABORATORY,
                organization_id=str(enc.clinic_id),
            )
            return _failure(
                consultation_id=consultation_id,
                reason=RecommendationFailureReason.NO_ELIGIBLE_LABORATORY,
                collection_mode=collection_mode,
                started=started,
                expanded_tests=expanded_tests,
                packages=packages,
            )

        winner = ranked[0]
        win_branch = winner.candidate.branch

        try:
            quoted_price, mrp_total, pricing_source = _quote_investigations_at_branch(
                investigations,
                win_branch,
            )
        except ValueError:
            return _failure(
                consultation_id=consultation_id,
                reason=RecommendationFailureReason.PRICING_FAILURE,
                collection_mode=collection_mode,
                started=started,
                expanded_tests=expanded_tests,
                packages=packages,
            )

        duration_ms = int((time.monotonic() - started) * 1000)
        savings = _compute_savings(mrp_total=mrp_total, quoted_price=quoted_price)
        from business_audit.decision.routing.hooks import schedule_marketplace_routing_decision

        schedule_marketplace_routing_decision(
            recommendation_id=str(consultation_id),
            collection_mode=collection_mode,
            all_evaluated=candidates,
            ranked=ranked,
            confidence=location.confidence,
            assigned=True,
            returned_count=len(candidates),
            filtered_count=len(candidates) - len(eligible),
            evaluation_time_ms=evaluation_time_ms,
            comparison_time_ms=comparison_time_ms,
            routing_time_ms=duration_ms,
            discount_amount=savings,
            savings=savings,
            organization_id=str(enc.clinic_id),
        )
        _log_completed(
            consultation_id,
            win_branch.pk,
            winner.candidate.estimated_price,
            duration_ms,
            winner.recommendation_labels,
        )

        return RecommendationResult(
            available=True,
            failure_reason=None,
            consultation_id=consultation_id,
            recommended_lab=winner.candidate.lab,
            recommended_branch=win_branch,
            collection_mode=collection_mode,
            expanded_tests=expanded_tests,
            packages=packages,
            routing_estimated_price=winner.candidate.estimated_price,
            quoted_price=quoted_price,
            mrp_total=mrp_total,
            savings=savings,
            pricing_source=pricing_source,
            estimated_tat_hours=winner.candidate.estimated_tat_hours,
            estimated_distance_km=winner.candidate.distance_km,
            routing_score=winner.final_score,
            ranking_labels=list(winner.recommendation_labels),
            generated_at=timezone.now(),
            duration_ms=duration_ms,
        )

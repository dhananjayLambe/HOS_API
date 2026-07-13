"""Build mandatory Decision Snapshot payloads from routing runtime objects."""

from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING, Any

from business_audit.decision.constants import CONFIDENCE_MAP, DEFAULT_ENGINE_VERSION, DEFAULT_RULE_ID
from business_audit.decision.types import (
    CandidateLab,
    DecisionSnapshot,
    DecisionTimings,
    Explanation,
    ProviderResponse,
    RejectedLab,
    RuleResult,
    WhyNotSelected,
)
from business_audit.enums import DecisionStrategy
from diagnostics_engine.services.routing.scoring_weights import ScoringWeights

if TYPE_CHECKING:
    from diagnostics_engine.services.routing.eligibility_engine import EligibilityCandidate
    from diagnostics_engine.services.routing.ranking_engine import RankedLab

REJECT_REASON_LABELS: dict[str, str] = {
    "branch_inactive": "Branch inactive",
    "org_not_orderable": "Organization not orderable",
    "outside_service_area": "Outside service area",
    "missing_test_pricing": "Missing test pricing",
    "home_collection_not_supported": "No home collection",
    "walk_in_not_supported": "Walk-in not supported",
    "beyond_home_collection_radius": "Beyond home collection radius",
    "sla_exceeded": "SLA exceeded",
}

RULE_PRIORITIES: dict[str, int] = {
    "in_service_area": 100,
    "has_service_pricing": 90,
    "branch_active": 80,
    "org_orderable": 70,
    "home_collection_supported": 60,
    "walk_in_supported": 50,
}


def confidence_to_float(confidence: str | None) -> float:
    if not confidence:
        return CONFIDENCE_MAP["medium"]
    return CONFIDENCE_MAP.get(str(confidence).lower(), CONFIDENCE_MAP["medium"])


def map_strategy(*, routing_strategy: str | None = None) -> str:
    if routing_strategy:
        upper = routing_strategy.upper()
        if upper in DecisionStrategy.values:
            return upper
    return DecisionStrategy.HYBRID


def build_rule_version(*, engine_version: str | None = None, weights: ScoringWeights | None = None) -> str:
    version = engine_version or DEFAULT_ENGINE_VERSION
    w = weights or ScoringWeights.from_django_settings()
    fingerprint = f"{int(w.distance * 100)}-{int(w.price * 100)}-{int(w.tat * 100)}"
    return f"{version}.{fingerprint}"


def weights_to_payload(weights: ScoringWeights | None = None) -> dict[str, int]:
    w = weights or ScoringWeights.from_django_settings()
    return {
        "price": int(w.price * 100),
        "sla": int(w.tat * 100),
        "distance": int(w.distance * 100),
        "quality": int(w.quality * 100),
    }


def build_rule_results_from_candidates(
    all_evaluated: list[EligibilityCandidate] | None,
) -> list[RuleResult]:
    if not all_evaluated:
        return []
    passed: set[str] = set()
    failed: set[str] = set()
    for cand in all_evaluated:
        for code in cand.eligibility_reasons:
            passed.add(code)
        for code in cand.ineligibility_reasons:
            failed.add(code)
    results: list[RuleResult] = []
    for code in sorted(passed):
        results.append(
            RuleResult(
                rule=code,
                outcome="passed",
                priority=RULE_PRIORITIES.get(code, 50),
            )
        )
    for code in sorted(failed):
        results.append(
            RuleResult(
                rule=code,
                outcome="failed",
                priority=RULE_PRIORITIES.get(code, 40),
            )
        )
    return results


def build_rejected_labs(all_evaluated: list[EligibilityCandidate] | None) -> list[RejectedLab]:
    if not all_evaluated:
        return []
    rejected: list[RejectedLab] = []
    for cand in all_evaluated:
        if not cand.ineligibility_reasons:
            continue
        primary = cand.ineligibility_reasons[0]
        rejected.append(
            RejectedLab(
                lab_id=str(cand.lab.pk),
                branch_id=str(cand.branch.pk),
                reason=primary,
                reason_label=REJECT_REASON_LABELS.get(primary, primary.replace("_", " ").title()),
            )
        )
    return rejected


def _price_float(val: Decimal | float | None) -> float | None:
    if val is None:
        return None
    return float(val)


def _sla_minutes(tat_hours: int | None) -> int | None:
    if tat_hours is None:
        return None
    return int(tat_hours) * 60


def build_candidate_labs(ranked: list[RankedLab] | None, *, confidence: str | None = None) -> list[CandidateLab]:
    if not ranked:
        return []
    conf = confidence_to_float(confidence)
    candidates: list[CandidateLab] = []
    for pos, rl in enumerate(ranked, start=1):
        c = rl.candidate
        candidates.append(
            CandidateLab(
                lab_id=str(c.lab.pk),
                branch_id=str(c.branch.pk),
                rank=pos,
                score=float(rl.final_score),
                confidence=conf,
                price=_price_float(c.estimated_price),
                discount=None,
                sla_minutes=_sla_minutes(c.estimated_tat_hours),
                distance_km=c.distance_km,
                labels=list(rl.recommendation_labels),
            )
        )
    return candidates


def build_explanation(
    *,
    ranked: list[RankedLab] | None,
    strategy: str,
    decision_path: list[str],
    assigned: bool,
) -> Explanation:
    if assigned and ranked:
        winner = ranked[0]
        summary = "Selected top-ranked laboratory using hybrid scoring."
        why_not: list[WhyNotSelected] = []
        for pos, rl in enumerate(ranked[1:4], start=2):
            why_not.append(
                WhyNotSelected(
                    lab_id=str(rl.candidate.lab.pk),
                    rank=pos,
                    reason="Lower hybrid score than selected lab",
                )
            )
        return Explanation(
            summary=summary,
            rule=strategy,
            decision_path=decision_path,
            why_not_selected=why_not,
        )
    return Explanation(
        summary="No laboratory met all routing rules.",
        rule=strategy,
        decision_path=decision_path,
        why_not_selected=[],
    )


def build_decision_snapshot(
    *,
    decision_id: str,
    routing_id: str,
    booking_id: str | None,
    attempt_number: int,
    ranked: list[RankedLab] | None = None,
    all_evaluated: list[EligibilityCandidate] | None = None,
    confidence: str | None = None,
    strategy: str | None = None,
    rule_id: str = DEFAULT_RULE_ID,
    engine_version: str | None = None,
    weights: ScoringWeights | None = None,
    discount_amount: Decimal | float | None = None,
    provider_response: ProviderResponse | None = None,
    timings: DecisionTimings | None = None,
    decision_path: list[str] | None = None,
    assigned: bool = False,
    decision_reason: str = "",
) -> dict[str, Any]:
    """Return a serializable decision snapshot dict for audit payloads."""
    resolved_strategy = map_strategy(routing_strategy=strategy)
    path = decision_path or []
    w = weights or ScoringWeights.from_django_settings()
    candidates = build_candidate_labs(ranked, confidence=confidence)
    if assigned and candidates and discount_amount:
        candidates[0].discount = _price_float(discount_amount)

    selected_lab_id = None
    selected_branch_id = None
    selected_score = None
    selected_rank = None
    if assigned and ranked:
        winner = ranked[0]
        selected_lab_id = str(winner.candidate.lab.pk)
        selected_branch_id = str(winner.candidate.branch.pk)
        selected_score = float(winner.final_score)
        selected_rank = 1
        if not decision_reason:
            decision_reason = "auto_top_ranked_provider"

    snapshot = DecisionSnapshot(
        decision_id=decision_id,
        routing_id=routing_id,
        booking_id=booking_id,
        attempt_number=attempt_number,
        strategy=resolved_strategy,
        rule_id=rule_id,
        rule_version=build_rule_version(engine_version=engine_version, weights=w),
        selected_lab_id=selected_lab_id,
        selected_branch_id=selected_branch_id,
        selected_score=selected_score,
        selected_rank=selected_rank,
        confidence=confidence_to_float(confidence),
        weights=weights_to_payload(w),
        candidate_labs=candidates,
        rule_results=build_rule_results_from_candidates(all_evaluated),
        rejected_labs=build_rejected_labs(all_evaluated),
        explanation=build_explanation(
            ranked=ranked,
            strategy=resolved_strategy,
            decision_path=path,
            assigned=assigned,
        ),
        provider_response=provider_response,
        decision_reason=decision_reason,
        timings_ms=timings or DecisionTimings(),
    )
    return snapshot.to_dict()

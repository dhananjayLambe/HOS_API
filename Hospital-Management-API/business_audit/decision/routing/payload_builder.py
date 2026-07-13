"""Build routing decision audit event payloads."""

from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING, Any

from business_audit.decision.routing.constants import MARKETPLACE_NAME
from business_audit.decision.snapshot_builder import build_decision_snapshot
from business_audit.decision.types import DecisionTimings, ProviderResponse

if TYPE_CHECKING:
    from diagnostics_engine.services.routing.eligibility_engine import EligibilityCandidate
    from diagnostics_engine.services.routing.ranking_engine import RankedLab


class RoutingPayloadBuilder:
    """Construct routing decision payloads with shared identity fields."""

    @staticmethod
    def _base(
        *,
        decision_id: str,
        routing_id: str,
        booking_id: str | None,
        attempt_number: int,
        recommendation_id: str | None = None,
        collection_mode: str | None = None,
        engine_version: str | None = None,
        execution_time_ms: int | None = None,
        extra: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "decision_id": decision_id,
            "routing_id": routing_id,
            "booking_id": booking_id,
            "attempt_number": attempt_number,
        }
        if recommendation_id:
            payload["recommendation_id"] = recommendation_id
        if collection_mode:
            payload["collection_mode"] = collection_mode
        if engine_version:
            payload["engine_version"] = engine_version
        if execution_time_ms is not None:
            payload["execution_time_ms"] = execution_time_ms
        if extra:
            payload.update(extra)
        return payload

    @classmethod
    def build_started(
        cls,
        *,
        decision_id: str,
        routing_id: str,
        booking_id: str | None,
        attempt_number: int,
        recommendation_id: str | None = None,
        collection_mode: str | None = None,
        engine_version: str | None = None,
    ) -> dict[str, Any]:
        return cls._base(
            decision_id=decision_id,
            routing_id=routing_id,
            booking_id=booking_id,
            attempt_number=attempt_number,
            recommendation_id=recommendation_id,
            collection_mode=collection_mode,
            engine_version=engine_version,
            extra={"stage": "started"},
        )

    @classmethod
    def build_rule_evaluated(
        cls,
        *,
        decision_id: str,
        routing_id: str,
        booking_id: str | None,
        attempt_number: int,
        all_evaluated: list[EligibilityCandidate] | None,
        evaluation_time_ms: int,
        recommendation_id: str | None = None,
        collection_mode: str | None = None,
    ) -> dict[str, Any]:
        evaluated_count = len(all_evaluated or [])
        eligible_count = len([c for c in (all_evaluated or []) if not c.ineligibility_reasons])
        return cls._base(
            decision_id=decision_id,
            routing_id=routing_id,
            booking_id=booking_id,
            attempt_number=attempt_number,
            recommendation_id=recommendation_id,
            collection_mode=collection_mode,
            execution_time_ms=evaluation_time_ms,
            extra={
                "stage": "rule_evaluated",
                "evaluated_branch_count": evaluated_count,
                "eligible_branch_count": eligible_count,
                "rejected_branch_count": evaluated_count - eligible_count,
            },
        )

    @classmethod
    def build_lab_matched(
        cls,
        *,
        decision_id: str,
        routing_id: str,
        booking_id: str | None,
        attempt_number: int,
        eligible_count: int,
        evaluated_count: int,
        recommendation_id: str | None = None,
        collection_mode: str | None = None,
    ) -> dict[str, Any]:
        return cls._base(
            decision_id=decision_id,
            routing_id=routing_id,
            booking_id=booking_id,
            attempt_number=attempt_number,
            recommendation_id=recommendation_id,
            collection_mode=collection_mode,
            extra={
                "stage": "matched",
                "eligible_count": eligible_count,
                "evaluated_count": evaluated_count,
            },
        )

    @classmethod
    def build_price_compared(
        cls,
        *,
        decision_id: str,
        routing_id: str,
        booking_id: str | None,
        attempt_number: int,
        ranked: list[RankedLab] | None,
        comparison_time_ms: int,
        recommendation_id: str | None = None,
        collection_mode: str | None = None,
    ) -> dict[str, Any]:
        prices = [
            float(r.candidate.estimated_price)
            for r in (ranked or [])
            if r.candidate.estimated_price is not None
        ]
        ranked_summary = []
        for pos, rl in enumerate(ranked or [], start=1):
            ranked_summary.append(
                {
                    "rank": pos,
                    "lab_id": str(rl.candidate.lab.pk),
                    "branch_id": str(rl.candidate.branch.pk),
                    "score": float(rl.final_score),
                    "price": float(rl.candidate.estimated_price)
                    if rl.candidate.estimated_price is not None
                    else None,
                }
            )
        return cls._base(
            decision_id=decision_id,
            routing_id=routing_id,
            booking_id=booking_id,
            attempt_number=attempt_number,
            recommendation_id=recommendation_id,
            collection_mode=collection_mode,
            execution_time_ms=comparison_time_ms,
            extra={
                "stage": "compared",
                "ranked_count": len(ranked or []),
                "min_price": min(prices) if prices else None,
                "max_price": max(prices) if prices else None,
                "ranked_candidates": ranked_summary,
            },
        )

    @classmethod
    def build_discount_applied(
        cls,
        *,
        decision_id: str,
        routing_id: str,
        booking_id: str | None,
        attempt_number: int,
        discount_amount: Decimal | float,
        savings: Decimal | float | None = None,
        discount_time_ms: int = 0,
        recommendation_id: str | None = None,
    ) -> dict[str, Any]:
        return cls._base(
            decision_id=decision_id,
            routing_id=routing_id,
            booking_id=booking_id,
            attempt_number=attempt_number,
            recommendation_id=recommendation_id,
            execution_time_ms=discount_time_ms,
            extra={
                "stage": "discounted",
                "discount_amount": float(discount_amount),
                "savings": float(savings) if savings is not None else float(discount_amount),
            },
        )

    @classmethod
    def build_lab_assigned(
        cls,
        *,
        decision_id: str,
        routing_id: str,
        booking_id: str | None,
        attempt_number: int,
        ranked: list[RankedLab],
        all_evaluated: list[EligibilityCandidate] | None,
        confidence: str | None,
        engine_version: str | None,
        discount_amount: Decimal | float | None,
        timings: DecisionTimings,
        decision_path: list[str],
        recommendation_id: str | None = None,
        collection_mode: str | None = None,
        provider_response: ProviderResponse | None = None,
        routing_time_ms: int | None = None,
    ) -> dict[str, Any]:
        snapshot = build_decision_snapshot(
            decision_id=decision_id,
            routing_id=routing_id,
            booking_id=booking_id,
            attempt_number=attempt_number,
            ranked=ranked,
            all_evaluated=all_evaluated,
            confidence=confidence,
            engine_version=engine_version,
            discount_amount=discount_amount,
            provider_response=provider_response,
            timings=timings,
            decision_path=decision_path,
            assigned=True,
        )
        winner = ranked[0]
        payload = cls._base(
            decision_id=decision_id,
            routing_id=routing_id,
            booking_id=booking_id,
            attempt_number=attempt_number,
            recommendation_id=recommendation_id,
            collection_mode=collection_mode,
            execution_time_ms=routing_time_ms,
            extra={
                "stage": "assigned",
                "selected_lab_id": str(winner.candidate.lab.pk),
                "selected_branch_id": str(winner.candidate.branch.pk),
                "selected_score": float(winner.final_score),
                "decision_snapshot": snapshot,
            },
        )
        return payload

    @classmethod
    def build_failed(
        cls,
        *,
        decision_id: str,
        routing_id: str,
        booking_id: str | None,
        attempt_number: int,
        reason: str,
        all_evaluated: list[EligibilityCandidate] | None,
        ranked: list[RankedLab] | None,
        confidence: str | None,
        engine_version: str | None,
        timings: DecisionTimings | None,
        decision_path: list[str],
        recommendation_id: str | None = None,
        collection_mode: str | None = None,
        provider_response: ProviderResponse | None = None,
        routing_time_ms: int | None = None,
    ) -> dict[str, Any]:
        snapshot = None
        if all_evaluated:
            snapshot = build_decision_snapshot(
                decision_id=decision_id,
                routing_id=routing_id,
                booking_id=booking_id,
                attempt_number=attempt_number,
                ranked=ranked,
                all_evaluated=all_evaluated,
                confidence=confidence,
                engine_version=engine_version,
                provider_response=provider_response,
                timings=timings or DecisionTimings(),
                decision_path=decision_path,
                assigned=False,
                decision_reason=reason,
            )
        payload = cls._base(
            decision_id=decision_id,
            routing_id=routing_id,
            booking_id=booking_id,
            attempt_number=attempt_number,
            recommendation_id=recommendation_id,
            collection_mode=collection_mode,
            execution_time_ms=routing_time_ms,
            extra={
                "stage": "failed",
                "failure_reason": reason,
            },
        )
        if snapshot:
            payload["decision_snapshot"] = snapshot
        return payload

    @classmethod
    def build_manual_override(
        cls,
        *,
        decision_id: str,
        routing_id: str,
        booking_id: str | None,
        attempt_number: int,
        override_version: int,
        before_branch_id: str,
        after_branch_id: str,
        before_lab_id: str | None,
        after_lab_id: str | None,
        ranked: list[RankedLab] | None,
        all_evaluated: list[EligibilityCandidate] | None,
        confidence: str | None,
        engine_version: str | None,
        timings: DecisionTimings | None = None,
        recommendation_id: str | None = None,
        override_reason: str = "manual_assignment",
    ) -> dict[str, Any]:
        snapshot = build_decision_snapshot(
            decision_id=decision_id,
            routing_id=routing_id,
            booking_id=booking_id,
            attempt_number=attempt_number,
            ranked=ranked,
            all_evaluated=all_evaluated,
            confidence=confidence,
            engine_version=engine_version,
            timings=timings or DecisionTimings(),
            decision_path=["manual_override"],
            assigned=True,
            decision_reason=override_reason,
        )
        if snapshot.get("selected_branch_id") is None:
            snapshot["selected_branch_id"] = after_branch_id
            snapshot["selected_lab_id"] = after_lab_id
        payload = cls._base(
            decision_id=decision_id,
            routing_id=routing_id,
            booking_id=booking_id,
            attempt_number=attempt_number,
            recommendation_id=recommendation_id,
            extra={
                "stage": "manual_override",
                "override_version": override_version,
                "before_branch_id": before_branch_id,
                "after_branch_id": after_branch_id,
                "before_lab_id": before_lab_id,
                "after_lab_id": after_lab_id,
                "override_reason": override_reason,
                "decision_snapshot": snapshot,
            },
        )
        return payload

    @staticmethod
    def marketplace_provider_response(
        *,
        returned_count: int,
        filtered_count: int,
        selected_count: int,
        marketplace: str = MARKETPLACE_NAME,
    ) -> ProviderResponse:
        return ProviderResponse(
            marketplace=marketplace,
            returned_count=returned_count,
            filtered_count=filtered_count,
            selected_count=selected_count,
        )

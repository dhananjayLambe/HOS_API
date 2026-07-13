"""Operational recommendation builder — suggestions only, not executable."""

from __future__ import annotations

from support_trace.incident.constants import RECOMMENDATION_RULES
from support_trace.incident.types import FailureAnalysis, IncidentRecommendation, RetryAnalysis
from support_trace.lookup.types import TraceLookupResult


class RecommendationBuilder:
    @classmethod
    def build(
        cls,
        lookup: TraceLookupResult,
        *,
        failure: FailureAnalysis | None = None,
        retry: RetryAnalysis | None = None,
    ) -> tuple[IncidentRecommendation, ...]:
        recommendations: list[IncidentRecommendation] = []
        seen: set[str] = set()

        if failure and failure.has_failure:
            cls._add_rule(failure.failure_stage or "", failure.failure_type, recommendations, seen, failure.failure_reason)
            cls._add_rule(failure.failure_type, failure.failure_type, recommendations, seen, failure.failure_reason)

        if retry:
            for wf_type, count in retry.by_workflow.items():
                if count > 0:
                    cls._add_rule(wf_type, wf_type, recommendations, seen, f"{count} retries detected")

        if lookup.health and lookup.health.overall in ("AttentionRequired", "Failed", "Retrying"):
            cls._add_rule("Timeout", "Timeout", recommendations, seen, f"Health: {lookup.health.overall}")

        return tuple(recommendations)

    @classmethod
    def _add_rule(
        cls,
        key: str,
        failure_type: str,
        recommendations: list[IncidentRecommendation],
        seen: set[str],
        reason: str | None,
    ) -> None:
        for rule_key, action in RECOMMENDATION_RULES:
            if rule_key.lower() in key.lower() or rule_key.lower() in failure_type.lower():
                if action not in seen:
                    seen.add(action)
                    priority = "high" if "fail" in str(reason or "").lower() else "medium"
                    recommendations.append(
                        IncidentRecommendation(
                            action=action,
                            reason=reason or f"Detected issue in {key}",
                            priority=priority,
                        )
                    )

"""Plans identifier search execution order."""

from __future__ import annotations

from support_trace.identifiers.constants import SearchStrategy
from support_trace.identifiers.identifier_registry import IdentifierRegistry
from support_trace.identifiers.types import DetectedIdentifier, SearchPlan, SearchPlanStep


class SearchPlanner:
    @classmethod
    def plan(
        cls,
        detected: DetectedIdentifier,
        *,
        expand_relationships: bool = True,
        exact_only: bool = False,
    ) -> SearchPlan:
        steps: list[SearchPlanStep] = [
            SearchPlanStep(
                strategy=SearchStrategy.EXACT,
                field_name=detected.field_name,
                value=detected.normalized,
            )
        ]
        if not exact_only:
            strategy = IdentifierRegistry.get_by_field(detected.field_name)
            if strategy is not None and strategy.supports_partial_search():
                steps.append(
                    SearchPlanStep(
                        strategy=SearchStrategy.PREFIX,
                        field_name=detected.field_name,
                        value=detected.normalized,
                    )
                )
                steps.append(
                    SearchPlanStep(
                        strategy=SearchStrategy.PARTIAL,
                        field_name=detected.field_name,
                        value=detected.normalized,
                    )
                )
        return SearchPlan(
            detected=detected,
            steps=tuple(steps),
            expand_relationships=expand_relationships,
        )

    @classmethod
    def plan_for_field(
        cls,
        field_name: str,
        value: str,
        *,
        identifier_type=None,
        expand_relationships: bool = True,
    ) -> SearchPlan:
        from support_trace.identifiers.types import IdentifierType

        detected = DetectedIdentifier(
            identifier_type=identifier_type or IdentifierType.PROVIDER_REFERENCE,
            confidence=1.0,
            reason="typed lookup",
            normalized=value,
            field_name=field_name,
        )
        return cls.plan(detected, expand_relationships=expand_relationships)

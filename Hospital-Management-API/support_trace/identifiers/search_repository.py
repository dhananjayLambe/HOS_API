"""Executes search plans against SupportTrace."""

from __future__ import annotations

from support_trace.identifiers.constants import PARTIAL_SEARCH_LIMIT, SearchStrategy
from support_trace.identifiers.types import SearchPlan, SearchResult
from support_trace.models import SupportTrace


class SupportTraceSearchRepository:
    @classmethod
    def execute(cls, plan: SearchPlan) -> SearchResult:
        for step in plan.steps:
            traces = cls._run_step(step)
            if traces:
                return SearchResult(
                    traces=traces,
                    matched_field=step.field_name,
                    matched_value=step.value,
                    strategy=step.strategy,
                )
        return SearchResult()

    @classmethod
    def exact_match(cls, field: str, value: str) -> list[SupportTrace]:
        return cls._ordered_query(**{field: value})

    @classmethod
    def prefix_search(
        cls,
        field: str,
        prefix: str,
        *,
        limit: int = PARTIAL_SEARCH_LIMIT,
    ) -> list[SupportTrace]:
        return list(
            SupportTrace.objects.filter(**{f"{field}__istartswith": prefix}).order_by(
                "-updated_at"
            )[:limit]
        )

    @classmethod
    def partial_search(
        cls,
        field: str,
        fragment: str,
        *,
        limit: int = PARTIAL_SEARCH_LIMIT,
    ) -> list[SupportTrace]:
        return list(
            SupportTrace.objects.filter(**{f"{field}__icontains": fragment}).order_by(
                "-updated_at"
            )[:limit]
        )

    @classmethod
    def suffix_search(
        cls,
        field: str,
        suffix: str,
        *,
        limit: int = PARTIAL_SEARCH_LIMIT,
    ) -> list[SupportTrace]:
        return list(
            SupportTrace.objects.filter(**{f"{field}__iendswith": suffix}).order_by(
                "-updated_at"
            )[:limit]
        )

    @classmethod
    def _run_step(cls, step) -> list[SupportTrace]:
        if step.strategy == SearchStrategy.EXACT:
            return cls.exact_match(step.field_name, step.value)
        if step.strategy == SearchStrategy.PREFIX:
            return cls.prefix_search(step.field_name, step.value)
        if step.strategy == SearchStrategy.PARTIAL:
            return cls.partial_search(step.field_name, step.value)
        return []

    @classmethod
    def _ordered_query(cls, **filters) -> list[SupportTrace]:
        return list(
            SupportTrace.objects.filter(**filters).order_by("-updated_at")
        )

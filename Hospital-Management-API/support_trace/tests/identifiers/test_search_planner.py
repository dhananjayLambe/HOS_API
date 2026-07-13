"""Tests for SearchPlanner."""

from __future__ import annotations

from django.test import TestCase

from support_trace.identifiers.constants import SearchStrategy
from support_trace.identifiers.search_planner import SearchPlanner
from support_trace.identifiers.types import DetectedIdentifier, IdentifierType


class SearchPlannerTests(TestCase):
    def test_plan_includes_exact_then_partial_for_provider(self) -> None:
        detected = DetectedIdentifier(
            identifier_type=IdentifierType.PROVIDER_REFERENCE,
            confidence=0.45,
            reason="fallback",
            normalized="lab-ref-1",
            field_name="provider_reference",
        )
        plan = SearchPlanner.plan(detected)
        strategies = [step.strategy for step in plan.steps]
        self.assertEqual(strategies[0], SearchStrategy.EXACT)
        self.assertIn(SearchStrategy.PREFIX, strategies)
        self.assertIn(SearchStrategy.PARTIAL, strategies)

    def test_exact_only_plan(self) -> None:
        detected = DetectedIdentifier(
            identifier_type=IdentifierType.BOOKING,
            confidence=0.75,
            reason="uuid",
            normalized="abc",
            field_name="booking_id",
        )
        plan = SearchPlanner.plan(detected, exact_only=True)
        self.assertEqual(len(plan.steps), 1)
        self.assertEqual(plan.steps[0].strategy, SearchStrategy.EXACT)

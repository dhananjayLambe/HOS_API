"""Unit tests for decision snapshot builder."""

from __future__ import annotations

from django.test import SimpleTestCase

from business_audit.decision.snapshot_builder import (
    build_decision_snapshot,
    build_rejected_labs,
    confidence_to_float,
    map_strategy,
)
from business_audit.decision.types import DecisionTimings, ProviderResponse
from business_audit.enums import DecisionStrategy
from business_audit.tests.decision.support import candidate_stub, ranked_stub


class DecisionSnapshotBuilderTests(SimpleTestCase):
    def test_mandatory_snapshot_on_assigned(self) -> None:
        ranked = [ranked_stub(), ranked_stub(final_score=80.0)]
        snapshot = build_decision_snapshot(
            decision_id="dec-1",
            routing_id="route-1",
            booking_id="book-1",
            attempt_number=1,
            ranked=ranked,
            all_evaluated=[ranked[0].candidate, ranked[1].candidate],
            confidence="high",
            assigned=True,
            decision_path=["rule_evaluated", "lab_matched", "price_compared", "lab_assigned"],
            timings=DecisionTimings(evaluation_time_ms=42, comparison_time_ms=18, routing_time_ms=85),
        )
        self.assertEqual(snapshot["decision_id"], "dec-1")
        self.assertEqual(snapshot["strategy"], DecisionStrategy.HYBRID)
        self.assertEqual(snapshot["selected_rank"], 1)
        self.assertAlmostEqual(snapshot["confidence"], 0.9)
        self.assertEqual(len(snapshot["candidate_labs"]), 2)
        self.assertEqual(snapshot["candidate_labs"][0]["rank"], 1)
        self.assertIn("explanation", snapshot)
        self.assertEqual(snapshot["timings_ms"]["routing_time_ms"], 85)

    def test_rejected_labs_with_reason_labels(self) -> None:
        rejected = build_rejected_labs(
            [candidate_stub(eligible=False, ineligibility_reasons=["outside_service_area"])]
        )
        self.assertEqual(rejected[0].reason, "outside_service_area")
        self.assertEqual(rejected[0].reason_label, "Outside service area")

    def test_partial_snapshot_on_failed(self) -> None:
        evaluated = [candidate_stub(eligible=False)]
        snapshot = build_decision_snapshot(
            decision_id="dec-fail",
            routing_id="route-fail",
            booking_id="book-1",
            attempt_number=2,
            all_evaluated=evaluated,
            assigned=False,
            decision_path=["rule_evaluated", "failed"],
            decision_reason="no_eligible_branches",
        )
        self.assertIsNone(snapshot["selected_branch_id"])
        self.assertEqual(len(snapshot["rejected_labs"]), 1)

    def test_provider_response_block(self) -> None:
        snapshot = build_decision_snapshot(
            decision_id="dec-mp",
            routing_id="route-mp",
            booking_id=None,
            attempt_number=1,
            ranked=[ranked_stub()],
            assigned=True,
            provider_response=ProviderResponse(
                marketplace="DoctorPro Marketplace",
                returned_count=6,
                filtered_count=2,
                selected_count=1,
            ),
        )
        self.assertEqual(snapshot["provider_response"]["returned_count"], 6)

    def test_confidence_mapping(self) -> None:
        self.assertEqual(confidence_to_float("medium"), 0.7)
        self.assertEqual(map_strategy(routing_strategy="HYBRID"), DecisionStrategy.HYBRID)

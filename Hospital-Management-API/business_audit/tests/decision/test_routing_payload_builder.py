"""Unit tests for routing payload builder."""

from __future__ import annotations

from decimal import Decimal

from django.test import SimpleTestCase

from business_audit.decision.routing.payload_builder import RoutingPayloadBuilder
from business_audit.decision.types import DecisionTimings
from business_audit.tests.decision.support import ranked_stub


class RoutingPayloadBuilderTests(SimpleTestCase):
    def test_started_payload_identity_fields(self) -> None:
        payload = RoutingPayloadBuilder.build_started(
            decision_id="d1",
            routing_id="r1",
            booking_id="b1",
            attempt_number=1,
            recommendation_id="rec-1",
            collection_mode="home",
            engine_version="v1",
        )
        self.assertEqual(payload["decision_id"], "d1")
        self.assertEqual(payload["routing_id"], "r1")
        self.assertEqual(payload["attempt_number"], 1)
        self.assertEqual(payload["stage"], "started")

    def test_price_compared_includes_ranked_summary(self) -> None:
        ranked = [ranked_stub(), ranked_stub(final_score=70.0)]
        payload = RoutingPayloadBuilder.build_price_compared(
            decision_id="d1",
            routing_id="r1",
            booking_id="b1",
            attempt_number=1,
            ranked=ranked,
            comparison_time_ms=18,
        )
        self.assertEqual(payload["ranked_count"], 2)
        self.assertEqual(len(payload["ranked_candidates"]), 2)
        self.assertEqual(payload["execution_time_ms"], 18)

    def test_lab_assigned_mandatory_snapshot(self) -> None:
        ranked = [ranked_stub()]
        payload = RoutingPayloadBuilder.build_lab_assigned(
            decision_id="d1",
            routing_id="r1",
            booking_id="b1",
            attempt_number=1,
            ranked=ranked,
            all_evaluated=[ranked[0].candidate],
            confidence="high",
            engine_version="v1",
            discount_amount=None,
            timings=DecisionTimings(routing_time_ms=90),
            decision_path=["rule_evaluated", "lab_matched", "price_compared", "lab_assigned"],
        )
        self.assertIn("decision_snapshot", payload)
        self.assertIsNotNone(payload["decision_snapshot"]["selected_branch_id"])

    def test_discount_applied_payload(self) -> None:
        payload = RoutingPayloadBuilder.build_discount_applied(
            decision_id="d1",
            routing_id="r1",
            booking_id="b1",
            attempt_number=1,
            discount_amount=Decimal("100"),
            savings=Decimal("100"),
            discount_time_ms=3,
        )
        self.assertEqual(payload["discount_amount"], 100.0)
        self.assertEqual(payload["stage"], "discounted")

    def test_manual_override_snapshot(self) -> None:
        payload = RoutingPayloadBuilder.build_manual_override(
            decision_id="d1",
            routing_id="r1",
            booking_id="b1",
            attempt_number=1,
            override_version=1,
            before_branch_id="br-old",
            after_branch_id="br-new",
            before_lab_id="lab-old",
            after_lab_id="lab-new",
            ranked=[ranked_stub()],
            all_evaluated=[],
            confidence="medium",
            engine_version="v1",
        )
        self.assertIn("decision_snapshot", payload)
        self.assertEqual(payload["override_version"], 1)

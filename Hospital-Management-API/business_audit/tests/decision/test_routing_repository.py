"""Unit tests for RoutingAuditRepository."""

from __future__ import annotations

import uuid

from django.test import TestCase

from business_audit.decision.routing.repository import RoutingAuditRepository
from business_audit.decision.routing.routing_audit_service import RoutingAuditService
from business_audit.decision.types import DecisionTimings
from business_audit.enums import BusinessAuditAction
from business_audit.tests.decision.support import ranked_stub, routing_audit_ids
from shared.logging.context import get_context_manager


class RoutingAuditRepositoryTests(TestCase):
    def tearDown(self) -> None:
        get_context_manager().clear()

    def _emit_assigned(self):
        ids = routing_audit_ids()
        decision_id = ids["decision_id"]
        routing_id = ids["routing_id"]
        booking_id = ids["booking_id"]
        ranked = [ranked_stub()]
        RoutingAuditService.emit_started(
            decision_id=decision_id,
            routing_id=routing_id,
            booking_id=booking_id,
            attempt_number=1,
            recommendation_id=ids["recommendation_id"],
            organization_id=ids["organization_id"],
        )
        RoutingAuditService.emit_lab_assigned(
            decision_id=decision_id,
            routing_id=routing_id,
            booking_id=booking_id,
            attempt_number=1,
            ranked=ranked,
            all_evaluated=[ranked[0].candidate],
            confidence="high",
            engine_version="v1",
            timings=DecisionTimings(),
            decision_path=["rule_evaluated", "lab_matched", "price_compared", "lab_assigned"],
            organization_id=ids["organization_id"],
        )
        return decision_id, routing_id, booking_id, ranked, ids

    def test_get_by_decision(self) -> None:
        decision_id, routing_id, booking_id, _, _ = self._emit_assigned()
        rows = RoutingAuditRepository().get_by_decision(decision_id)
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0].action, BusinessAuditAction.ROUTING_STARTED)

    def test_get_by_routing(self) -> None:
        decision_id, routing_id, booking_id, _, _ = self._emit_assigned()
        rows = RoutingAuditRepository().get_by_routing(routing_id)
        self.assertEqual(len(rows), 2)

    def test_get_by_booking(self) -> None:
        decision_id, routing_id, booking_id, ranked, _ = self._emit_assigned()
        rows = RoutingAuditRepository().get_by_booking(booking_id)
        self.assertGreaterEqual(len(rows), 1)

    def test_get_by_lab(self) -> None:
        decision_id, routing_id, booking_id, ranked, _ = self._emit_assigned()
        lab_id = str(ranked[0].candidate.lab.pk)
        branch_id = str(ranked[0].candidate.branch.pk)
        rows = RoutingAuditRepository().get_by_lab(laboratory_id=lab_id)
        self.assertGreaterEqual(len(rows), 1)
        rows = RoutingAuditRepository().get_by_lab(branch_id=branch_id)
        self.assertGreaterEqual(len(rows), 1)

    def test_get_latest_decision_for_routing(self) -> None:
        decision_id, routing_id, booking_id, _, _ = self._emit_assigned()
        latest = RoutingAuditRepository().get_latest_decision_for_routing(routing_id)
        self.assertIsNotNone(latest)
        self.assertEqual(latest.action, BusinessAuditAction.ROUTING_LAB_ASSIGNED)

    def test_has_action_for_decision(self) -> None:
        decision_id, routing_id, booking_id, _, _ = self._emit_assigned()
        repo = RoutingAuditRepository()
        self.assertTrue(
            repo.has_action_for_decision(
                decision_id=decision_id,
                action=BusinessAuditAction.ROUTING_STARTED,
            )
        )
        self.assertFalse(
            repo.has_action_for_decision(
                decision_id=decision_id,
                action=BusinessAuditAction.ROUTING_FAILED,
            )
        )

    def test_get_failed_decisions(self) -> None:
        ids = routing_audit_ids()
        RoutingAuditService.emit_started(
            decision_id=ids["decision_id"],
            routing_id=ids["routing_id"],
            booking_id=ids["booking_id"],
            attempt_number=1,
            organization_id=ids["organization_id"],
        )
        RoutingAuditService.emit_failed(
            decision_id=ids["decision_id"],
            routing_id=ids["routing_id"],
            booking_id=ids["booking_id"],
            attempt_number=1,
            reason="no_match",
            decision_path=["failed"],
            organization_id=ids["organization_id"],
        )
        rows = RoutingAuditRepository().get_failed_decisions()
        self.assertGreaterEqual(len(rows), 1)

    def test_next_override_version(self) -> None:
        decision_id, routing_id, booking_id, ranked, ids = self._emit_assigned()
        repo = RoutingAuditRepository()
        version = repo.next_override_version(decision_id)
        self.assertEqual(version, 1)
        RoutingAuditService.emit_manual_override(
            decision_id=decision_id,
            routing_id=routing_id,
            booking_id=booking_id,
            attempt_number=1,
            override_version=1,
            before_branch_id="a",
            after_branch_id="b",
            before_lab_id="l1",
            after_lab_id="l2",
            ranked=ranked,
            organization_id=ids["organization_id"],
        )
        self.assertEqual(repo.next_override_version(decision_id), 2)

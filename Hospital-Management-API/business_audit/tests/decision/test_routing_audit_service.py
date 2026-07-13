"""Unit tests for RoutingAuditService."""

from __future__ import annotations

import uuid

from django.test import TestCase

from business_audit.decision.routing.constants import (
    DECISION_STATE_ASSIGNED,
    DECISION_STATE_COMPARED,
    DECISION_STATE_FAILED,
    DECISION_STATE_MATCHED,
    DECISION_STATE_RULE_EVALUATED,
    DECISION_STATE_STARTED,
)
from business_audit.decision.routing.routing_audit_service import RoutingAuditService
from business_audit.decision.types import DecisionTimings
from business_audit.enums import (
    BusinessAuditAction,
    BusinessResourceType,
    WorkflowOutcome,
    WorkflowType,
)
from business_audit.models import BusinessAudit
from business_audit.tests.decision.support import ranked_stub, routing_audit_ids
from shared.logging.context import get_context_manager


class RoutingAuditServiceTests(TestCase):
    def tearDown(self) -> None:
        get_context_manager().clear()

    def _base_ids(self):
        return routing_audit_ids()

    def test_emit_started_fsm(self) -> None:
        ids = self._base_ids()
        result = RoutingAuditService.emit_started(
            **ids,
            collection_mode="lab",
            engine_version="v1",
        )
        self.assertTrue(result.success)
        audit = BusinessAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.action, BusinessAuditAction.ROUTING_STARTED)
        self.assertEqual(audit.workflow_type, WorkflowType.ROUTING)
        self.assertEqual(audit.workflow_instance_id, ids["routing_id"])
        self.assertEqual(audit.resource_type, BusinessResourceType.DECISION)
        self.assertEqual(audit.resource_id, ids["decision_id"])
        self.assertEqual(audit.parent_workflow_instance_id, ids["booking_id"])
        self.assertIsNone(audit.state_before)
        self.assertEqual(audit.state_after, DECISION_STATE_STARTED)

    def test_emit_started_idempotent(self) -> None:
        ids = self._base_ids()
        first = RoutingAuditService.emit_started(**ids)
        second = RoutingAuditService.emit_started(**ids)
        self.assertTrue(first.success)
        self.assertIsNone(second)

    def test_full_success_fsm_chain(self) -> None:
        ids = self._base_ids()
        ranked = [ranked_stub(), ranked_stub(final_score=70.0)]
        RoutingAuditService.emit_started(**ids)
        RoutingAuditService.emit_rule_evaluated(
            **ids,
            all_evaluated=[ranked[0].candidate, ranked[1].candidate],
            evaluation_time_ms=40,
        )
        RoutingAuditService.emit_lab_matched(
            **ids,
            eligible_count=2,
            evaluated_count=2,
        )
        RoutingAuditService.emit_price_compared(
            **ids,
            ranked=ranked,
            comparison_time_ms=15,
        )
        result = RoutingAuditService.emit_lab_assigned(
            **ids,
            ranked=ranked,
            all_evaluated=[ranked[0].candidate, ranked[1].candidate],
            confidence="high",
            engine_version="v1",
            timings=DecisionTimings(routing_time_ms=80),
            decision_path=["rule_evaluated", "lab_matched", "price_compared", "lab_assigned"],
        )
        self.assertTrue(result.success)
        audit = BusinessAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.state_after, DECISION_STATE_ASSIGNED)
        self.assertEqual(audit.outcome, WorkflowOutcome.SUCCESS)
        payload = audit.new_value["payload"]
        self.assertIn("decision_snapshot", payload)
        self.assertEqual(payload["decision_snapshot"]["selected_rank"], 1)

        rows = BusinessAudit.objects.filter(resource_id=ids["decision_id"]).order_by("sequence_no")
        self.assertEqual(rows.count(), 5)
        self.assertEqual(rows[1].state_after, DECISION_STATE_RULE_EVALUATED)
        self.assertEqual(rows[2].state_after, DECISION_STATE_MATCHED)
        self.assertEqual(rows[3].state_after, DECISION_STATE_COMPARED)

    def test_emit_failed_with_partial_snapshot(self) -> None:
        ids = self._base_ids()
        RoutingAuditService.emit_started(**ids)
        result = RoutingAuditService.emit_failed(
            **ids,
            reason="no_eligible_branches",
            all_evaluated=[ranked_stub().candidate],
            decision_path=["rule_evaluated", "failed"],
        )
        self.assertTrue(result.success)
        audit = BusinessAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.state_after, DECISION_STATE_FAILED)
        self.assertEqual(audit.outcome, WorkflowOutcome.FAILURE)
        self.assertIn("decision_snapshot", audit.new_value["payload"])

    def test_emit_failed_idempotent(self) -> None:
        ids = self._base_ids()
        first = RoutingAuditService.emit_failed(
            **ids,
            reason="routing_failed",
            decision_path=["failed"],
        )
        second = RoutingAuditService.emit_failed(
            **ids,
            reason="routing_failed",
            decision_path=["failed"],
        )
        self.assertTrue(first.success)
        self.assertIsNone(second)

    def test_emit_manual_override_mandatory_snapshot(self) -> None:
        ids = self._base_ids()
        RoutingAuditService.emit_started(**ids)
        RoutingAuditService.emit_lab_assigned(
            **ids,
            ranked=[ranked_stub()],
            all_evaluated=[],
            confidence="medium",
            engine_version="v1",
            timings=DecisionTimings(),
            decision_path=["rule_evaluated", "lab_matched", "price_compared", "lab_assigned"],
        )
        result = RoutingAuditService.emit_manual_override(
            **ids,
            override_version=1,
            before_branch_id="br-1",
            after_branch_id="br-2",
            before_lab_id="lab-1",
            after_lab_id="lab-2",
            ranked=[ranked_stub()],
            confidence="medium",
            engine_version="v1",
        )
        self.assertTrue(result.success)
        audit = BusinessAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.action, BusinessAuditAction.ROUTING_MANUAL_OVERRIDE)
        self.assertIn("decision_snapshot", audit.new_value["payload"])

    def test_manual_override_version_idempotency(self) -> None:
        ids = self._base_ids()
        kwargs = dict(
            **ids,
            before_branch_id="br-1",
            after_branch_id="br-2",
            before_lab_id="lab-1",
            after_lab_id="lab-2",
        )
        first = RoutingAuditService.emit_manual_override(**kwargs, override_version=1)
        second = RoutingAuditService.emit_manual_override(**kwargs, override_version=1)
        third = RoutingAuditService.emit_manual_override(**kwargs, override_version=2)
        self.assertTrue(first.success)
        self.assertIsNone(second)
        self.assertTrue(third.success)

    def test_discount_applied_idempotent(self) -> None:
        ids = self._base_ids()
        RoutingAuditService.emit_started(**ids)
        RoutingAuditService.emit_rule_evaluated(**ids, all_evaluated=[], evaluation_time_ms=1)
        RoutingAuditService.emit_lab_matched(**ids, eligible_count=1, evaluated_count=1)
        RoutingAuditService.emit_price_compared(**ids, ranked=[ranked_stub()], comparison_time_ms=1)
        first = RoutingAuditService.emit_discount_applied(
            **ids,
            discount_amount=50,
            savings=50,
            discount_time_ms=2,
        )
        second = RoutingAuditService.emit_discount_applied(
            **ids,
            discount_amount=50,
            savings=50,
            discount_time_ms=2,
        )
        self.assertTrue(first.success)
        self.assertIsNone(second)

    def test_attempt_number_in_payload(self) -> None:
        ids = self._base_ids()
        ids["attempt_number"] = 2
        RoutingAuditService.emit_started(**ids)
        audit = BusinessAudit.objects.get(resource_id=ids["decision_id"])
        self.assertEqual(audit.new_value["payload"]["attempt_number"], 2)

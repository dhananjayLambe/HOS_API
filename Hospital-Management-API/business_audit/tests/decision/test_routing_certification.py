"""Routing decision certification tests."""

from __future__ import annotations

from django.test import TestCase

from business_audit.decision.certification.routing_certification_service import (
    RoutingDecisionCertificationService,
)
from business_audit.decision.routing.routing_audit_service import RoutingAuditService
from business_audit.decision.types import DecisionTimings
from business_audit.enums import (
    ActorType,
    BusinessAuditAction,
    BusinessResourceType,
    EventCategory,
    WorkflowOutcome,
    WorkflowStatus,
    WorkflowType,
)
from business_audit.services import BusinessAuditService
from business_audit.tests.decision.support import ranked_stub, routing_audit_ids
from shared.logging.context import get_context_manager


class RoutingCertificationTests(TestCase):
    def tearDown(self) -> None:
        get_context_manager().clear()

    def _emit_valid_journey(self, *, correlation_id: str):
        ids = routing_audit_ids()
        decision_id = ids["decision_id"]
        routing_id = ids["routing_id"]
        booking_id = ids["booking_id"]
        org_id = ids["organization_id"]
        ranked = [ranked_stub()]
        common = dict(
            decision_id=decision_id,
            routing_id=routing_id,
            booking_id=booking_id,
            attempt_number=1,
            correlation_id=correlation_id,
            organization_id=org_id,
        )
        RoutingAuditService.emit_started(**common, recommendation_id=ids["recommendation_id"])
        RoutingAuditService.emit_rule_evaluated(
            **common,
            all_evaluated=[ranked[0].candidate],
            evaluation_time_ms=20,
        )
        RoutingAuditService.emit_lab_matched(**common, eligible_count=1, evaluated_count=1)
        RoutingAuditService.emit_price_compared(
            **common,
            ranked=ranked,
            comparison_time_ms=10,
        )
        RoutingAuditService.emit_lab_assigned(
            **common,
            ranked=ranked,
            all_evaluated=[ranked[0].candidate],
            confidence="high",
            engine_version="v1",
            timings=DecisionTimings(routing_time_ms=50),
            decision_path=["rule_evaluated", "lab_matched", "price_compared", "lab_assigned"],
        )
        return decision_id, booking_id

    def test_certification_passes_valid_journey(self) -> None:
        ids = routing_audit_ids()
        correlation_id = ids["correlation_id"]
        decision_id, booking_id = self._emit_valid_journey(correlation_id=correlation_id)
        report = RoutingDecisionCertificationService().certify(
            correlation_id=correlation_id,
            booking_id=booking_id,
            decision_id=decision_id,
        )
        self.assertTrue(report.passed)
        self.assertEqual(report.decision_ids, [decision_id])
        self.assertGreaterEqual(report.event_count, 5)

    def test_certification_passes_failed_terminal(self) -> None:
        ids = routing_audit_ids()
        correlation_id = ids["correlation_id"]
        common = dict(
            decision_id=ids["decision_id"],
            routing_id=ids["routing_id"],
            booking_id=ids["booking_id"],
            attempt_number=1,
            correlation_id=correlation_id,
            organization_id=ids["organization_id"],
        )
        RoutingAuditService.emit_started(**common)
        RoutingAuditService.emit_failed(
            **common,
            reason="no_eligible_branches",
            all_evaluated=[ranked_stub().candidate],
            decision_path=["rule_evaluated", "failed"],
        )
        report = RoutingDecisionCertificationService().certify(
            correlation_id=correlation_id,
            decision_id=ids["decision_id"],
        )
        self.assertTrue(report.passed)

    def test_certification_fails_duplicate_started(self) -> None:
        ids = routing_audit_ids()
        correlation_id = ids["correlation_id"]
        payload = {
            "decision_id": ids["decision_id"],
            "routing_id": ids["routing_id"],
            "booking_id": ids["booking_id"],
            "attempt_number": 1,
        }
        base = dict(
            action=BusinessAuditAction.ROUTING_STARTED,
            event="Routing started duplicate",
            workflow_type=WorkflowType.ROUTING,
            workflow_instance_id=ids["routing_id"],
            parent_workflow_instance_id=ids["booking_id"],
            category=EventCategory.ROUTING,
            domain="diagnostics_engine",
            service="RoutingService",
            operation="start_routing_for_order",
            resource_type=BusinessResourceType.DECISION,
            resource_id=ids["decision_id"],
            organization_id=ids["organization_id"],
            status=WorkflowStatus.RUNNING,
            outcome=WorkflowOutcome.UNKNOWN,
            actor_type=ActorType.SYSTEM,
            payload=payload,
            correlation_id=correlation_id,
        )
        for _ in range(2):
            BusinessAuditService.record(**base)
        RoutingAuditService.emit_failed(
            decision_id=ids["decision_id"],
            routing_id=ids["routing_id"],
            booking_id=ids["booking_id"],
            attempt_number=1,
            reason="no_match",
            decision_path=["failed"],
            correlation_id=correlation_id,
            organization_id=ids["organization_id"],
        )
        report = RoutingDecisionCertificationService().certify(
            correlation_id=correlation_id,
            decision_id=ids["decision_id"],
        )
        self.assertFalse(report.passed)
        self.assertTrue(any("routing.started" in e for e in report.errors))

    def test_certification_fails_missing_snapshot_on_assigned(self) -> None:
        ids = routing_audit_ids()
        correlation_id = ids["correlation_id"]
        RoutingAuditService.emit_started(
            decision_id=ids["decision_id"],
            routing_id=ids["routing_id"],
            booking_id=ids["booking_id"],
            attempt_number=1,
            correlation_id=correlation_id,
            organization_id=ids["organization_id"],
        )
        BusinessAuditService.record(
            action=BusinessAuditAction.ROUTING_LAB_ASSIGNED,
            event="Routing lab assigned (bad)",
            workflow_type=WorkflowType.ROUTING,
            workflow_instance_id=ids["routing_id"],
            parent_workflow_instance_id=ids["booking_id"],
            category=EventCategory.ROUTING,
            domain="diagnostics_engine",
            service="AssignmentService",
            operation="assign_routing_winner",
            resource_type=BusinessResourceType.DECISION,
            resource_id=ids["decision_id"],
            organization_id=ids["organization_id"],
            status=WorkflowStatus.COMPLETED,
            outcome=WorkflowOutcome.SUCCESS,
            actor_type=ActorType.SYSTEM,
            payload={
                "decision_id": ids["decision_id"],
                "routing_id": ids["routing_id"],
                "booking_id": ids["booking_id"],
                "attempt_number": 1,
                "stage": "assigned",
            },
            correlation_id=correlation_id,
        )
        report = RoutingDecisionCertificationService().certify(
            correlation_id=correlation_id,
            decision_id=ids["decision_id"],
        )
        self.assertFalse(report.passed)
        self.assertTrue(any("decision_snapshot" in e for e in report.errors))

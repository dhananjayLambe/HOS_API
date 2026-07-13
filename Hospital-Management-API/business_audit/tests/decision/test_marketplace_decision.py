"""Marketplace routing decision audit tests."""

from __future__ import annotations

import uuid
from decimal import Decimal

from django.test import TestCase

from business_audit.decision.routing.hooks import schedule_marketplace_routing_decision
from business_audit.decision.routing.repository import RoutingAuditRepository
from business_audit.enums import BusinessAuditAction
from business_audit.tests.decision.support import candidate_stub, ranked_stub, routing_audit_ids
from tests.factories.clinic import ClinicFactory
from shared.logging.context import LogContext, get_context_manager


class MarketplaceDecisionTests(TestCase):
    def tearDown(self) -> None:
        get_context_manager().clear()

    def test_marketplace_success_emits_provider_response(self) -> None:
        recommendation_id = str(uuid.uuid4())
        correlation_id = str(uuid.uuid4())
        clinic = ClinicFactory()
        get_context_manager().set(
            LogContext(
                correlation_id=correlation_id,
                parent_workflow_instance_id=recommendation_id,
                recommendation_id=recommendation_id,
            )
        )
        ranked = [ranked_stub(), ranked_stub(final_score=70.0)]
        candidates = [ranked[0].candidate, ranked[1].candidate]

        with self.captureOnCommitCallbacks(execute=True):
            schedule_marketplace_routing_decision(
                recommendation_id=recommendation_id,
                collection_mode="lab",
                all_evaluated=candidates,
                ranked=ranked,
                confidence="high",
                assigned=True,
                returned_count=6,
                filtered_count=2,
                evaluation_time_ms=35,
                comparison_time_ms=12,
                routing_time_ms=60,
                discount_amount=Decimal("50"),
                savings=Decimal("50"),
                organization_id=str(clinic.id),
            )

        rows = RoutingAuditRepository().get_by_marketplace("DoctorPro Marketplace")
        self.assertGreaterEqual(len(rows), 1)
        assigned = [r for r in rows if r.action == BusinessAuditAction.ROUTING_LAB_ASSIGNED]
        self.assertTrue(assigned)
        snapshot = assigned[0].new_value["payload"]["decision_snapshot"]
        self.assertEqual(snapshot["provider_response"]["returned_count"], 6)
        self.assertEqual(snapshot["provider_response"]["selected_count"], 1)
        self.assertIsNone(snapshot["booking_id"])
        self.assertEqual(assigned[0].parent_workflow_instance_id, recommendation_id)

    def test_marketplace_no_match_emits_failed(self) -> None:
        recommendation_id = str(uuid.uuid4())
        clinic = ClinicFactory()
        candidates = [candidate_stub(eligible=False)]

        with self.captureOnCommitCallbacks(execute=True):
            schedule_marketplace_routing_decision(
                recommendation_id=recommendation_id,
                collection_mode="home",
                all_evaluated=candidates,
                ranked=[],
                confidence="low",
                assigned=False,
                returned_count=3,
                filtered_count=3,
                failure_reason="NO_ELIGIBLE_LABORATORY",
                organization_id=str(clinic.id),
            )

        failed = RoutingAuditRepository().get_failed_decisions()
        self.assertTrue(any(r.parent_workflow_instance_id == recommendation_id for r in failed))

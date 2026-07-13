"""Integration tests for routing decision audit."""

from __future__ import annotations

import uuid
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase

from business_audit.decision.routing.hooks import (
    RoutingDecisionContext,
    ensure_routing_decision_identity,
    schedule_routing_business_manual_override,
    schedule_routing_decision_evaluated,
    schedule_routing_decision_outcome,
    schedule_routing_decision_started,
)
from business_audit.decision.routing.repository import RoutingAuditRepository
from business_audit.decision.routing.routing_audit_service import RoutingAuditService
from business_audit.enums import BusinessAuditAction, BusinessResourceType, WorkflowType
from business_audit.models import BusinessAudit
from business_audit.tests.decision.support import (
    candidate_stub,
    create_booking_order,
    create_routing_run_for_order,
    ranked_stub,
    setup_booking_context,
)
from shared.logging.context import get_context_manager


class RoutingDecisionHookIntegrationTests(TestCase):
    def tearDown(self) -> None:
        get_context_manager().clear()

    def test_pipeline_success_emits_terminal_assigned(self) -> None:
        ctx_data = setup_booking_context()
        order = create_booking_order(ctx_data)
        run = create_routing_run_for_order(order)
        correlation_id = ctx_data["correlation_id"]

        with self.captureOnCommitCallbacks(execute=True):
            decision_ctx = schedule_routing_decision_started(
                routing_run=run,
                order=order,
            )
            decision_ctx.all_evaluated = [ranked_stub().candidate]
            decision_ctx.ranked = [ranked_stub()]
            decision_ctx.confidence = "medium"
            decision_ctx.evaluation_time_ms = 30
            decision_ctx.comparison_time_ms = 10
            decision_ctx.routing_time_ms = 50
            schedule_routing_decision_evaluated(ctx=decision_ctx)
            schedule_routing_decision_outcome(ctx=decision_ctx, assigned=True)

        rows = RoutingAuditRepository().get_by_decision(decision_ctx.decision_id)
        actions = [r.action for r in rows]
        self.assertIn(BusinessAuditAction.ROUTING_STARTED, actions)
        self.assertIn(BusinessAuditAction.ROUTING_RULE_EVALUATED, actions)
        self.assertIn(BusinessAuditAction.ROUTING_LAB_MATCHED, actions)
        self.assertIn(BusinessAuditAction.ROUTING_PRICE_COMPARED, actions)
        self.assertIn(BusinessAuditAction.ROUTING_LAB_ASSIGNED, actions)
        terminal = [r for r in rows if r.action == BusinessAuditAction.ROUTING_LAB_ASSIGNED][0]
        self.assertIn("decision_snapshot", terminal.new_value["payload"])

    def test_pipeline_no_match_emits_failed(self) -> None:
        ctx_data = setup_booking_context()
        order = create_booking_order(ctx_data)
        run = create_routing_run_for_order(order)

        with self.captureOnCommitCallbacks(execute=True):
            decision_ctx = schedule_routing_decision_started(routing_run=run, order=order)
            decision_ctx.all_evaluated = [candidate_stub(eligible=False)]
            decision_ctx.ranked = []
            schedule_routing_decision_evaluated(ctx=decision_ctx)
            schedule_routing_decision_outcome(
                ctx=decision_ctx,
                assigned=False,
                failure_reason="no_eligible_branches",
            )

        rows = RoutingAuditRepository().get_by_decision(decision_ctx.decision_id)
        self.assertTrue(
            any(r.action == BusinessAuditAction.ROUTING_FAILED for r in rows)
        )

    def test_decision_identity_persisted_on_run_metadata(self) -> None:
        ctx_data = setup_booking_context()
        order = create_booking_order(ctx_data)
        run = create_routing_run_for_order(order)
        decision_id, attempt_number = ensure_routing_decision_identity(run, order=order)
        run.refresh_from_db()
        self.assertEqual(run.metadata["decision_id"], decision_id)
        self.assertEqual(run.metadata["attempt_number"], 1)

    def test_retry_increments_attempt_number(self) -> None:
        ctx_data = setup_booking_context()
        order = create_booking_order(ctx_data)
        run1 = create_routing_run_for_order(order)
        _, attempt1 = ensure_routing_decision_identity(run1, order=order)
        run2 = create_routing_run_for_order(order)
        _, attempt2 = ensure_routing_decision_identity(run2, order=order)
        self.assertEqual(attempt1, 1)
        self.assertEqual(attempt2, 2)

    def test_manual_override_hook(self) -> None:
        ctx_data = setup_booking_context()
        order = create_booking_order(ctx_data)
        run = create_routing_run_for_order(order)
        with self.captureOnCommitCallbacks(execute=True):
            schedule_routing_business_manual_override(
                order=order,
                routing_run=run,
                before_branch_id=str(uuid.uuid4()),
                after_branch_id=str(uuid.uuid4()),
                before_lab_id=str(uuid.uuid4()),
                after_lab_id=str(uuid.uuid4()),
                ranked=[ranked_stub()],
            )
        rows = BusinessAudit.objects.filter(
            action=BusinessAuditAction.ROUTING_MANUAL_OVERRIDE,
            new_value__payload__booking_id=str(order.pk),
        )
        self.assertEqual(rows.count(), 1)
        self.assertIn("decision_snapshot", rows[0].new_value["payload"])

    def test_fail_open_hooks_do_not_raise(self) -> None:
        ctx_data = setup_booking_context()
        order = create_booking_order(ctx_data)
        run = create_routing_run_for_order(order)
        with patch.object(
            RoutingAuditService,
            "emit_started",
            side_effect=RuntimeError("audit down"),
        ):
            schedule_routing_decision_started(routing_run=run, order=order)

    def test_workflow_hierarchy_fields(self) -> None:
        ctx_data = setup_booking_context()
        order = create_booking_order(ctx_data)
        run = create_routing_run_for_order(order)
        with self.captureOnCommitCallbacks(execute=True):
            ctx = schedule_routing_decision_started(routing_run=run, order=order)
            ctx.ranked = [ranked_stub()]
            ctx.all_evaluated = [ctx.ranked[0].candidate]
            schedule_routing_decision_evaluated(ctx=ctx)
            schedule_routing_decision_outcome(ctx=ctx, assigned=True)

        audit = BusinessAudit.objects.filter(
            resource_id=ctx.decision_id,
            action=BusinessAuditAction.ROUTING_LAB_ASSIGNED,
        ).first()
        self.assertEqual(audit.workflow_type, WorkflowType.ROUTING)
        self.assertEqual(audit.resource_type, BusinessResourceType.DECISION)
        self.assertEqual(audit.parent_workflow_instance_id, str(order.pk))

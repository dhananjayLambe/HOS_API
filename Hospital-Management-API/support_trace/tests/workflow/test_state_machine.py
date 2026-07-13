"""State machine and transition validator tests."""

from __future__ import annotations

import uuid

from django.test import TestCase

from business_audit.enums import BusinessResourceType, WorkflowType
from support_trace.enums import TraceStatus
from support_trace.exceptions import WorkflowTransitionError
from support_trace.models import SupportTrace
from support_trace.tests.support import record_trace_event, setup_trace_context
from support_trace.workflow.state_machine import is_transition_allowed
from support_trace.workflow.transition_validator import WorkflowTransitionValidator
from support_trace.workflow.types import WorkflowStateTransition


class StateMachineTests(TestCase):
    def test_booking_created_to_confirmed(self) -> None:
        self.assertTrue(
            is_transition_allowed(WorkflowType.BOOKING, "Created", "Confirmed")
        )

    def test_booking_completed_cannot_run(self) -> None:
        self.assertFalse(
            is_transition_allowed(WorkflowType.BOOKING, "Closed", "Created")
        )

    def test_routing_override_path(self) -> None:
        self.assertTrue(
            is_transition_allowed(WorkflowType.ROUTING, "Assigned", "Manual Override")
        )


class TransitionValidatorTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_terminal_regression_blocked(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(
            clinic,
            wf_id,
            correlation_id=corr_id,
            status=TraceStatus.COMPLETED,
            last_event="booking.closed",
            current_state="Closed",
        )
        existing = SupportTrace.objects.get(workflow_instance_id=wf_id)
        transition = WorkflowStateTransition(
            current_state="Created",
            workflow_step="x",
            trace_status=TraceStatus.RUNNING,
        )
        with self.assertRaises(WorkflowTransitionError):
            WorkflowTransitionValidator.validate(
                workflow_type=WorkflowType.BOOKING,
                transition=transition,
                existing=existing,
            )

    def test_manual_override_allowed(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(
            clinic,
            wf_id,
            correlation_id=corr_id,
            workflow_type=WorkflowType.ROUTING,
            resource_type=BusinessResourceType.DECISION,
            status=TraceStatus.COMPLETED,
            last_event="routing.lab_assigned",
            current_state="Assigned",
        )
        existing = SupportTrace.objects.get(workflow_instance_id=wf_id)
        transition = WorkflowStateTransition(
            current_state="Manual Override",
            workflow_step="override",
            trace_status=TraceStatus.RUNNING,
            allow_regression=True,
        )
        WorkflowTransitionValidator.validate(
            workflow_type=WorkflowType.ROUTING,
            transition=transition,
            existing=existing,
        )

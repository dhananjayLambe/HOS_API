"""Integration tests for nested workflows and lifecycle timelines."""

from __future__ import annotations

import uuid

from django.test import TestCase

from business_audit.domain.repository import BusinessAuditRepository
from business_audit.enums import (
    BusinessAuditAction,
    WorkflowOutcome,
    WorkflowStatus,
)
from business_audit.tests.support import record_workflow_event, setup_business_audit_context
from shared.logging.context import LogContext, get_context_manager


class BusinessAuditIntegrationTests(TestCase):
    def setUp(self) -> None:
        self.repository = BusinessAuditRepository()
        self.correlation_id = str(uuid.uuid4())
        self.parent_workflow_instance_id = str(uuid.uuid4())
        self.booking_workflow_instance_id = str(uuid.uuid4())
        self.whatsapp_workflow_instance_id = str(uuid.uuid4())
        self.clinic, _, _ = setup_business_audit_context(
            correlation_id=self.correlation_id,
            workflow_instance_id=self.parent_workflow_instance_id,
        )

    def tearDown(self) -> None:
        get_context_manager().clear()

    def test_nested_workflow_hierarchy(self) -> None:
        record_workflow_event(
            self.clinic,
            self.parent_workflow_instance_id,
            correlation_id=self.correlation_id,
            event="Recommendation workflow started",
            sequence_no=1,
        )
        record_workflow_event(
            self.clinic,
            self.booking_workflow_instance_id,
            parent_workflow_instance_id=self.parent_workflow_instance_id,
            correlation_id=self.correlation_id,
            event="Booking workflow started",
            sequence_no=1,
        )
        record_workflow_event(
            self.clinic,
            self.whatsapp_workflow_instance_id,
            parent_workflow_instance_id=self.booking_workflow_instance_id,
            correlation_id=self.correlation_id,
            event="WhatsApp workflow started",
            sequence_no=1,
        )

        children = self.repository.filter_by_parent_workflow(
            self.parent_workflow_instance_id
        )
        self.assertEqual(len(children), 1)
        self.assertEqual(children[0].workflow_instance_id, self.booking_workflow_instance_id)

        nested = self.repository.filter_by_parent_workflow(
            self.booking_workflow_instance_id
        )
        self.assertEqual(len(nested), 1)
        self.assertEqual(
            nested[0].workflow_instance_id, self.whatsapp_workflow_instance_id
        )

        correlation_records = self.repository.get_by_correlation(self.correlation_id)
        self.assertEqual(len(correlation_records), 3)

    def test_five_step_lifecycle_under_one_instance(self) -> None:
        workflow_instance_id = str(uuid.uuid4())
        get_context_manager().set(
            LogContext(
                correlation_id=self.correlation_id,
                workflow_instance_id=workflow_instance_id,
            )
        )

        lifecycle = [
            (BusinessAuditAction.WORKFLOW_STARTED, WorkflowStatus.STARTED, None, "Started"),
            (BusinessAuditAction.WORKFLOW_QUEUED, WorkflowStatus.QUEUED, "Started", "Queued"),
            (BusinessAuditAction.WORKFLOW_RUNNING, WorkflowStatus.RUNNING, "Queued", "Running"),
            (
                BusinessAuditAction.WORKFLOW_COMPLETED,
                WorkflowStatus.COMPLETED,
                "Running",
                "Completed",
            ),
        ]

        for action, status, state_before, state_after in lifecycle:
            result = record_workflow_event(
                self.clinic,
                workflow_instance_id,
                correlation_id=self.correlation_id,
                action=action,
                event=action.label,
                status=status,
                outcome=WorkflowOutcome.SUCCESS
                if status == WorkflowStatus.COMPLETED
                else WorkflowOutcome.UNKNOWN,
                state_before=state_before,
                state_after=state_after,
            )
            self.assertTrue(result.success)

        records = self.repository.get_by_workflow_instance(workflow_instance_id)
        self.assertEqual(len(records), 4)
        self.assertEqual([r.sequence_no for r in records], [1, 2, 3, 4])
        self.assertEqual(records[-1].status, WorkflowStatus.COMPLETED)
        self.assertEqual(records[-1].outcome, WorkflowOutcome.SUCCESS)
        self.assertTrue(
            all(record.correlation_id == self.correlation_id for record in records)
        )

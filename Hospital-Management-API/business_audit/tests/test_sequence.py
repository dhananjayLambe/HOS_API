"""Unit tests for sequence_no assignment and ordering."""

from __future__ import annotations

from django.test import TestCase

from business_audit.domain.repository import BusinessAuditRepository
from business_audit.enums import BusinessAuditAction, WorkflowStatus
from business_audit.tests.support import record_workflow_event, setup_business_audit_context


class BusinessAuditSequenceTests(TestCase):
    def setUp(self) -> None:
        self.clinic, self.correlation_id, self.workflow_instance_id = (
            setup_business_audit_context()
        )
        self.repository = BusinessAuditRepository()

    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_auto_assigns_monotonic_sequence(self) -> None:
        first = record_workflow_event(
            self.clinic,
            self.workflow_instance_id,
            action=BusinessAuditAction.WORKFLOW_STARTED,
            status=WorkflowStatus.STARTED,
        )
        second = record_workflow_event(
            self.clinic,
            self.workflow_instance_id,
            action=BusinessAuditAction.WORKFLOW_RUNNING,
            event="Workflow running",
            status=WorkflowStatus.RUNNING,
        )
        third = record_workflow_event(
            self.clinic,
            self.workflow_instance_id,
            action=BusinessAuditAction.WORKFLOW_COMPLETED,
            event="Workflow completed",
            status=WorkflowStatus.COMPLETED,
        )

        self.assertTrue(first.success)
        self.assertTrue(second.success)
        self.assertTrue(third.success)
        self.assertEqual(first.sequence_no, 1)
        self.assertEqual(second.sequence_no, 2)
        self.assertEqual(third.sequence_no, 3)

    def test_repository_orders_by_sequence_no(self) -> None:
        record_workflow_event(
            self.clinic,
            self.workflow_instance_id,
            sequence_no=2,
            action=BusinessAuditAction.WORKFLOW_RUNNING,
            event="Running",
            status=WorkflowStatus.RUNNING,
        )
        record_workflow_event(
            self.clinic,
            self.workflow_instance_id,
            sequence_no=1,
            action=BusinessAuditAction.WORKFLOW_STARTED,
            status=WorkflowStatus.STARTED,
        )

        records = self.repository.get_by_workflow_instance(self.workflow_instance_id)
        sequences = [record.sequence_no for record in records]
        self.assertEqual(sequences, sorted(sequences))

    def test_max_sequence_no_returns_highest(self) -> None:
        record_workflow_event(
            self.clinic,
            self.workflow_instance_id,
            sequence_no=5,
        )
        self.assertEqual(
            self.repository.max_sequence_no(self.workflow_instance_id), 5
        )

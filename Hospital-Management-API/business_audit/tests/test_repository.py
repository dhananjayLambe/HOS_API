"""Unit tests for BusinessAuditRepository."""

from __future__ import annotations

import uuid

from django.test import TestCase

from business_audit.domain.repository import BusinessAuditRepository
from business_audit.enums import BusinessAuditAction, WorkflowStatus
from business_audit.tests.support import record_workflow_event, setup_business_audit_context


class BusinessAuditRepositoryTests(TestCase):
    def setUp(self) -> None:
        self.clinic, self.correlation_id, self.workflow_instance_id = (
            setup_business_audit_context()
        )
        self.parent_workflow_instance_id = str(uuid.uuid4())
        self.child_workflow_instance_id = str(uuid.uuid4())
        self.repository = BusinessAuditRepository()

    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_get_by_workflow_instance(self) -> None:
        record_workflow_event(self.clinic, self.workflow_instance_id, sequence_no=1)
        record_workflow_event(
            self.clinic,
            self.workflow_instance_id,
            sequence_no=2,
            action=BusinessAuditAction.WORKFLOW_COMPLETED,
            event="Completed",
            status=WorkflowStatus.COMPLETED,
        )
        records = self.repository.get_by_workflow_instance(self.workflow_instance_id)
        self.assertEqual(len(records), 2)
        self.assertEqual([r.sequence_no for r in records], [1, 2])

    def test_filter_by_parent_workflow(self) -> None:
        record_workflow_event(
            self.clinic,
            self.child_workflow_instance_id,
            parent_workflow_instance_id=self.parent_workflow_instance_id,
            correlation_id=self.correlation_id,
        )
        records = self.repository.filter_by_parent_workflow(
            self.parent_workflow_instance_id
        )
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0].workflow_instance_id, self.child_workflow_instance_id)

    def test_get_by_correlation(self) -> None:
        record_workflow_event(self.clinic, self.workflow_instance_id)
        records = self.repository.get_by_correlation(self.correlation_id)
        self.assertEqual(len(records), 1)

    def test_get_by_provider_reference(self) -> None:
        record_workflow_event(
            self.clinic,
            self.workflow_instance_id,
            provider_reference="wamid.abc123",
        )
        records = self.repository.get_by_provider_reference("wamid.abc123")
        self.assertEqual(len(records), 1)

    def test_filter_by_domain_and_category(self) -> None:
        record_workflow_event(self.clinic, self.workflow_instance_id)
        domain_records = self.repository.filter_by_domain("notifications")
        category_records = self.repository.filter_by_category("Notification")
        self.assertEqual(len(domain_records), 1)
        self.assertEqual(len(category_records), 1)

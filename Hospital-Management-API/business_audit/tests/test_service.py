"""Unit tests for BusinessAuditService."""

from __future__ import annotations

import uuid

from django.test import TestCase

from business_audit.enums import (
    BusinessAuditAction,
    WorkflowOutcome,
    WorkflowStatus,
)
from business_audit.models import BusinessAudit
from business_audit.services import BusinessAuditService
from business_audit.tests.support import record_workflow_event, setup_business_audit_context


class BusinessAuditServiceTests(TestCase):
    def setUp(self) -> None:
        self.clinic, self.correlation_id, self.workflow_instance_id = (
            setup_business_audit_context()
        )

    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_record_success(self) -> None:
        result = record_workflow_event(self.clinic, self.workflow_instance_id)
        self.assertTrue(result.success)
        self.assertIsNotNone(result.audit_id)
        self.assertEqual(result.workflow_instance_id, self.workflow_instance_id)
        self.assertEqual(result.sequence_no, 1)
        self.assertTrue(
            BusinessAudit.objects.filter(pk=result.audit_id).exists()
        )

    def test_fail_open_on_validation_error(self) -> None:
        result = BusinessAuditService.record(
            action=BusinessAuditAction.WORKFLOW_STARTED,
            event="Workflow started",
            workflow_type="Notification",
            workflow_instance_id="invalid",
            category="Notification",
            domain="notifications",
            service="WhatsAppService",
            operation="send_message",
            resource_type="Message",
            resource_id=str(uuid.uuid4()),
            organization_id=str(self.clinic.id),
            status=WorkflowStatus.STARTED,
            actor_type="System",
            validate_references=False,
        )
        self.assertFalse(result.success)
        self.assertEqual(result.error_type, "AuditValidationError")

    def test_status_completed_with_failure_outcome(self) -> None:
        result = record_workflow_event(
            self.clinic,
            self.workflow_instance_id,
            action=BusinessAuditAction.WORKFLOW_COMPLETED,
            event="Workflow completed with failure",
            status=WorkflowStatus.COMPLETED,
            outcome=WorkflowOutcome.FAILURE,
            state_before="Running",
            state_after="Failed",
        )
        self.assertTrue(result.success)
        audit = BusinessAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.status, WorkflowStatus.COMPLETED)
        self.assertEqual(audit.outcome, WorkflowOutcome.FAILURE)

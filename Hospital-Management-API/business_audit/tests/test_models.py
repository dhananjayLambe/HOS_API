"""Unit tests for BusinessAudit model."""

from __future__ import annotations

import uuid

from django.test import TestCase

from business_audit.enums import (
    ActorType,
    BusinessAuditAction,
    BusinessResourceType,
    EventCategory,
    WorkflowOutcome,
    WorkflowStatus,
    WorkflowType,
)
from business_audit.models import BusinessAudit
from business_audit.tests.support import setup_business_audit_context


class BusinessAuditModelTests(TestCase):
    def setUp(self) -> None:
        self.clinic, self.correlation_id, self.workflow_instance_id = (
            setup_business_audit_context()
        )

    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def _create(self, **overrides) -> BusinessAudit:
        defaults = {
            "correlation_id": self.correlation_id,
            "workflow_type": WorkflowType.NOTIFICATION,
            "workflow_instance_id": self.workflow_instance_id,
            "sequence_no": 1,
            "category": EventCategory.NOTIFICATION,
            "action": BusinessAuditAction.WORKFLOW_STARTED,
            "event": "Workflow started",
            "domain": "notifications",
            "service": "WhatsAppService",
            "operation": "send_message",
            "resource_type": BusinessResourceType.MESSAGE,
            "resource_id": str(uuid.uuid4()),
            "actor_type": ActorType.SYSTEM,
            "organization_id": str(self.clinic.id),
            "status": WorkflowStatus.STARTED,
            "outcome": WorkflowOutcome.UNKNOWN,
        }
        defaults.update(overrides)
        return BusinessAudit.objects.create(**defaults)

    def test_required_fields_persist(self) -> None:
        audit = self._create(
            state_before="Queued",
            state_after="Running",
            status=WorkflowStatus.RUNNING,
            outcome=WorkflowOutcome.SUCCESS,
        )
        self.assertEqual(audit.workflow_instance_id, self.workflow_instance_id)
        self.assertEqual(audit.sequence_no, 1)
        self.assertEqual(audit.status, WorkflowStatus.RUNNING)
        self.assertEqual(audit.outcome, WorkflowOutcome.SUCCESS)
        self.assertEqual(audit.state_before, "Queued")
        self.assertEqual(audit.state_after, "Running")

    def test_status_and_outcome_can_differ(self) -> None:
        audit = self._create(
            status=WorkflowStatus.COMPLETED,
            outcome=WorkflowOutcome.FAILURE,
        )
        self.assertEqual(audit.status, WorkflowStatus.COMPLETED)
        self.assertEqual(audit.outcome, WorkflowOutcome.FAILURE)

    def test_str_representation(self) -> None:
        audit = self._create(sequence_no=3)
        self.assertIn(self.workflow_instance_id, str(audit))
        self.assertIn("#3", str(audit))

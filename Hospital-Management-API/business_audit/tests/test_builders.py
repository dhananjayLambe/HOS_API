"""Unit tests for BusinessAuditBuilder."""

from __future__ import annotations

import uuid

from django.test import TestCase

from business_audit.constants import META_KEY, PAYLOAD_KEY
from business_audit.domain.builders import BusinessAuditBuilder
from business_audit.domain.validators import BusinessAuditRequestValidator
from business_audit.enums import (
    ActorType,
    BusinessAuditAction,
    BusinessResourceType,
    EventCategory,
    WorkflowOutcome,
    WorkflowStatus,
    WorkflowType,
)
from shared.audit.envelope import META_BUILDER_VERSION, META_SCHEMA_VERSION
from shared.logging.context import LogContext, get_context_manager
from tests.factories.clinic import ClinicFactory


class BusinessAuditBuilderTests(TestCase):
    def setUp(self) -> None:
        self.clinic = ClinicFactory()
        self.correlation_id = str(uuid.uuid4())
        self.workflow_instance_id = str(uuid.uuid4())
        get_context_manager().set(
            LogContext(
                correlation_id=self.correlation_id,
                request_id="req-456",
                user_id="CTX-USER",
                workflow_instance_id=self.workflow_instance_id,
                parent_workflow_instance_id=str(uuid.uuid4()),
                environment="test",
                deployment="1.0.0-test",
            )
        )

    def tearDown(self) -> None:
        get_context_manager().clear()

    def _validated(self, **overrides):
        kwargs = {
            "action": BusinessAuditAction.WORKFLOW_STARTED,
            "event": "Workflow started",
            "workflow_type": WorkflowType.NOTIFICATION,
            "workflow_instance_id": self.workflow_instance_id,
            "category": EventCategory.NOTIFICATION,
            "domain": "notifications",
            "service": "WhatsAppService",
            "operation": "send_message",
            "resource_type": BusinessResourceType.MESSAGE,
            "resource_id": str(uuid.uuid4()),
            "organization_id": str(self.clinic.id),
            "status": WorkflowStatus.STARTED,
            "outcome": WorkflowOutcome.UNKNOWN,
            "actor_type": ActorType.SYSTEM,
            "payload": {"channel": "whatsapp"},
            "validate_references": True,
        }
        kwargs.update(overrides)
        return BusinessAuditRequestValidator.validate(**kwargs)

    def test_builds_unsaved_instance_with_envelope(self) -> None:
        record = BusinessAuditBuilder.build(self._validated())

        self.assertTrue(record._state.adding)
        self.assertEqual(record.correlation_id, self.correlation_id)
        self.assertEqual(record.workflow_instance_id, self.workflow_instance_id)
        self.assertEqual(record.sequence_no, 1)
        self.assertIn(META_KEY, record.new_value)
        meta = record.new_value[META_KEY]
        self.assertEqual(meta[META_SCHEMA_VERSION], "1.0")
        self.assertEqual(meta[META_BUILDER_VERSION], "1.0.0")
        self.assertEqual(meta["workflow_instance_id"], self.workflow_instance_id)
        self.assertEqual(record.new_value[PAYLOAD_KEY], {"channel": "whatsapp"})

    def test_auto_assigns_sequence_no(self) -> None:
        first = BusinessAuditBuilder.build(self._validated())
        first.save()
        second = BusinessAuditBuilder.build(
            self._validated(action=BusinessAuditAction.WORKFLOW_RUNNING)
        )
        self.assertEqual(second.sequence_no, 2)

    def test_merges_log_context_environment(self) -> None:
        record = BusinessAuditBuilder.build(self._validated())
        self.assertEqual(record.environment, "test")
        self.assertEqual(record.deployment, "1.0.0-test")

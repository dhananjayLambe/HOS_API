"""Unit tests for BusinessAuditRequestValidator."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from django.test import TestCase

from business_audit.domain.validators import BusinessAuditRequestValidator
from business_audit.enums import (
    ActorType,
    BusinessAuditAction,
    BusinessResourceType,
    EventCategory,
    ExternalProvider,
    WorkflowOutcome,
    WorkflowStatus,
    WorkflowType,
)
from business_audit.exceptions import AuditValidationError
from business_audit.tests.support import setup_business_audit_context


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class BusinessAuditValidatorTests(TestCase):
    def setUp(self) -> None:
        self.clinic, self.correlation_id, self.workflow_instance_id = (
            setup_business_audit_context()
        )

    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def _base_kwargs(self):
        return {
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
            "validate_references": True,
        }

    def test_validates_required_observability_fields(self) -> None:
        validated = BusinessAuditRequestValidator.validate(**self._base_kwargs())
        self.assertEqual(validated.domain, "notifications")
        self.assertEqual(validated.service, "WhatsAppService")
        self.assertEqual(validated.operation, "send_message")

    def test_rejects_missing_domain(self) -> None:
        kwargs = self._base_kwargs()
        kwargs["domain"] = "  "
        with self.assertRaises(AuditValidationError):
            BusinessAuditRequestValidator.validate(**kwargs)

    def test_rejects_invalid_workflow_instance_id(self) -> None:
        kwargs = self._base_kwargs()
        kwargs["workflow_instance_id"] = "not-a-uuid"
        with self.assertRaises(AuditValidationError):
            BusinessAuditRequestValidator.validate(**kwargs)

    def test_validates_provider_fields(self) -> None:
        validated = BusinessAuditRequestValidator.validate(
            **self._base_kwargs(),
            external_provider=ExternalProvider.META,
            provider_reference="wamid.123",
            provider_response_code="200",
            provider_response_message="accepted",
        )
        self.assertEqual(validated.external_provider, ExternalProvider.META)
        self.assertEqual(validated.provider_reference, "wamid.123")

    def test_validates_timing_bounds(self) -> None:
        started = utc_now()
        finished = started - timedelta(seconds=5)
        with self.assertRaises(AuditValidationError):
            BusinessAuditRequestValidator.validate(
                **self._base_kwargs(),
                started_at=started,
                finished_at=finished,
            )

    def test_separates_status_and_outcome(self) -> None:
        kwargs = self._base_kwargs()
        kwargs["status"] = WorkflowStatus.COMPLETED
        kwargs["outcome"] = WorkflowOutcome.FAILURE
        validated = BusinessAuditRequestValidator.validate(**kwargs)
        self.assertEqual(validated.status, WorkflowStatus.COMPLETED)
        self.assertEqual(validated.outcome, WorkflowOutcome.FAILURE)

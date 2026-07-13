"""Timeline API tests."""

from __future__ import annotations

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
from business_audit.services.business_audit_service import BusinessAuditService
from support_trace.tests.api.support import support_api_client
from support_trace.tests.support import setup_trace_context


class TimelineAPITests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_correlation_timeline(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        with self.captureOnCommitCallbacks(execute=True):
            BusinessAuditService.record(
                action=BusinessAuditAction.BOOKING_CREATED,
                event="Booking created",
                workflow_type=WorkflowType.BOOKING,
                workflow_instance_id=wf_id,
                category=EventCategory.BOOKING,
                domain="diagnostics",
                service="OrderService",
                operation="create",
                resource_type=BusinessResourceType.BOOKING,
                resource_id="ORD-API-1",
                organization_id=str(clinic.id),
                status=WorkflowStatus.STARTED,
                outcome=WorkflowOutcome.SUCCESS,
                actor_type=ActorType.SYSTEM,
                correlation_id=corr_id,
                validate_references=False,
            )
        client, _ = support_api_client()
        response = client.get(f"/api/v1/support/correlation/{corr_id}/timeline")
        self.assertEqual(response.status_code, 200)
        self.assertIn("events", response.data["data"])

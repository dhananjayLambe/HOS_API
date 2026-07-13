"""Tests for IdentifierSyncService."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from django.test import TestCase

from business_audit.enums import BusinessResourceType, WorkflowType
from support_trace.domain.sync_event import SupportTraceSyncEvent
from support_trace.enums import TraceSource, TraceStatus
from support_trace.identifiers.identifier_sync_service import IdentifierSyncService
from support_trace.models import SupportTrace
from support_trace.tests.support import record_trace_event, setup_trace_context
from support_trace.workflow.types import ResolvedWorkflow


class SyncServiceTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def _event(self, *, booking_id: str, report_id: str | None = None):
        return SupportTraceSyncEvent(
            workflow_instance_id=str(uuid.uuid4()),
            workflow_type=WorkflowType.BOOKING,
            resource_type=BusinessResourceType.BOOKING,
            resource_id=booking_id,
            organization_id=str(uuid.uuid4()),
            last_event="booking.created",
            last_sequence_no=1,
            source=TraceSource.BUSINESS_AUDIT,
            audit_id=str(uuid.uuid4()),
            status=TraceStatus.RUNNING,
            identifiers={"report_id": report_id} if report_id else None,
            payload={"phone_number": "+91 98765 43210"},
        )

    def _resolved(self, event: SupportTraceSyncEvent) -> ResolvedWorkflow:
        return ResolvedWorkflow(
            workflow_instance_id=event.workflow_instance_id,
            workflow_type=event.workflow_type,
            resource_type=event.resource_type,
            resource_id=event.resource_id,
            organization_id=event.organization_id,
            last_event=event.last_event,
        )

    def test_sync_extracts_and_validates(self) -> None:
        booking_id = str(uuid.uuid4())
        event = self._event(booking_id=booking_id)
        result = IdentifierSyncService.sync(event, resolved=self._resolved(event))
        self.assertIn("booking_id", result.identifiers)
        self.assertIn("phone_number", result.identifiers)
        self.assertEqual(result.identifier_count, 2)

    def test_accumulative_merge_preserves_existing(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        booking_id = str(uuid.uuid4())
        record_trace_event(
            clinic,
            wf_id,
            correlation_id=corr_id,
            identifiers={"booking_id": booking_id},
        )
        existing = SupportTrace.objects.get(workflow_instance_id=wf_id)
        report_id = str(uuid.uuid4())
        event = SupportTraceSyncEvent(
            workflow_instance_id=wf_id,
            workflow_type=WorkflowType.REPORT_DELIVERY,
            resource_type=BusinessResourceType.REPORT,
            resource_id=report_id,
            organization_id=str(clinic.id),
            last_event="report.uploaded",
            last_sequence_no=2,
            source=TraceSource.BUSINESS_AUDIT,
            audit_id=str(uuid.uuid4()),
            status=TraceStatus.RUNNING,
            payload={"report_id": report_id},
        )
        resolved = ResolvedWorkflow(
            workflow_instance_id=wf_id,
            workflow_type=event.workflow_type,
            resource_type=event.resource_type,
            resource_id=report_id,
            organization_id=str(clinic.id),
            last_event=event.last_event,
        )
        result = IdentifierSyncService.sync(event, resolved=resolved, existing=existing)
        self.assertEqual(result.identifiers["booking_id"], booking_id.lower())
        self.assertEqual(result.identifiers["report_id"], report_id.lower())
        self.assertGreaterEqual(result.identifier_count, 2)

    def test_first_seen_at_set_on_new_identifiers(self) -> None:
        booking_id = str(uuid.uuid4())
        event = self._event(booking_id=booking_id)
        result = IdentifierSyncService.sync(event, resolved=self._resolved(event))
        self.assertIsNotNone(result.first_seen_at)
        assert result.first_seen_at is not None
        self.assertLessEqual(result.first_seen_at, datetime.now(timezone.utc))

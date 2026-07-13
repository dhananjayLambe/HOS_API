"""Tests for SupportTraceSyncEvent and ProjectionEngine."""

from __future__ import annotations

import uuid

from django.test import TestCase

from business_audit.enums import BusinessResourceType, WorkflowType
from support_trace.domain.sync_event import SupportTraceSyncEvent
from support_trace.enums import TraceSource, TraceStatus
from support_trace.exceptions import TraceValidationError
from support_trace.services.projection_engine import ProjectionEngine
from support_trace.tests.support import setup_trace_context


class SupportTraceSyncEventTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_valid_business_audit_event(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        event = SupportTraceSyncEvent(
            workflow_instance_id=wf_id,
            workflow_type=WorkflowType.BOOKING,
            resource_type=BusinessResourceType.BOOKING,
            resource_id=str(uuid.uuid4()),
            organization_id=str(clinic.id),
            last_event="booking.confirmed",
            last_sequence_no=2,
            source=TraceSource.BUSINESS_AUDIT,
            audit_id=str(uuid.uuid4()),
            status=TraceStatus.RUNNING,
            action="booking.confirmed",
            correlation_id=corr_id,
            workflow_step="booking.confirmed",
        )
        event.validate()
        result = ProjectionEngine.project(event)
        self.assertTrue(result.success)

    def test_invalid_source_raises(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        event = SupportTraceSyncEvent(
            workflow_instance_id=wf_id,
            workflow_type=WorkflowType.BOOKING,
            resource_type=BusinessResourceType.BOOKING,
            resource_id=str(uuid.uuid4()),
            organization_id=str(clinic.id),
            last_event="x",
            last_sequence_no=1,
            source=TraceSource.MANUAL,
            audit_id=str(uuid.uuid4()),
            status=TraceStatus.RUNNING,
            correlation_id=corr_id,
        )
        with self.assertRaises(TraceValidationError):
            event.validate()

    def test_clinical_audit_sets_clinical_reference(self) -> None:
        audit_id = str(uuid.uuid4())
        event = SupportTraceSyncEvent(
            workflow_instance_id=str(uuid.uuid4()),
            workflow_type=WorkflowType.BOOKING,
            resource_type=BusinessResourceType.BOOKING,
            resource_id=str(uuid.uuid4()),
            organization_id=str(uuid.uuid4()),
            last_event="consultation.updated",
            last_sequence_no=1,
            source=TraceSource.CLINICAL_AUDIT,
            audit_id=audit_id,
            status=TraceStatus.RUNNING,
            correlation_id=str(uuid.uuid4()),
        )
        self.assertEqual(event.last_clinical_audit_id, audit_id)
        self.assertIsNone(event.last_business_audit_id)

"""Unit tests for SupportTraceService."""

from __future__ import annotations

import uuid
from unittest.mock import patch

from django.test import TestCase

from business_audit.enums import WorkflowType
from support_trace.enums import SyncStatus, TraceStatus, WorkflowHealth
from support_trace.exceptions import TraceValidationError
from support_trace.services.support_trace_service import SupportTraceService
from support_trace.tests.support import record_trace_event, setup_trace_context


class SupportTraceServiceTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_record_success(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        result = record_trace_event(clinic, wf_id, correlation_id=corr_id)
        self.assertTrue(result.success)
        self.assertEqual(result.sync_status, SyncStatus.INDEXED)
        self.assertTrue(result.created)

    def test_upsert_updates_existing(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        first = record_trace_event(clinic, wf_id, correlation_id=corr_id)
        second = record_trace_event(
            clinic,
            wf_id,
            correlation_id=corr_id,
            status=TraceStatus.COMPLETED,
            last_event="booking.completed",
        )
        self.assertTrue(second.success)
        self.assertFalse(second.created)
        self.assertEqual(second.trace_version, 2)
        self.assertEqual(first.trace_id, second.trace_id)

    def test_workflow_health_failed_on_failed_status(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(
            clinic,
            wf_id,
            correlation_id=corr_id,
            status=TraceStatus.FAILED,
            last_event="booking.failed",
        )
        from support_trace.models import SupportTrace

        trace = SupportTrace.objects.get(workflow_instance_id=wf_id)
        self.assertEqual(trace.workflow_health, WorkflowHealth.FAILED)

    def test_fail_open_on_validation_error(self) -> None:
        clinic, _, wf_id = setup_trace_context()
        result = SupportTraceService.record(
            workflow_instance_id=wf_id,
            workflow_type=WorkflowType.BOOKING,
            resource_type="Booking",
            resource_id=str(uuid.uuid4()),
            organization_id=str(clinic.id),
            status=TraceStatus.RUNNING,
            last_event="x",
            correlation_id="not-a-uuid",
        )
        self.assertFalse(result.success)
        self.assertEqual(result.sync_status, SyncStatus.FAILED)

    def test_raise_on_failure_propagates(self) -> None:
        clinic, _, wf_id = setup_trace_context()
        with patch.object(
            SupportTraceService._validator,
            "validate",
            side_effect=TraceValidationError("bad"),
        ):
            with self.assertRaises(TraceValidationError):
                SupportTraceService.record(
                    workflow_instance_id=wf_id,
                    workflow_type=WorkflowType.BOOKING,
                    resource_type="Booking",
                    resource_id=str(uuid.uuid4()),
                    organization_id=str(clinic.id),
                    status=TraceStatus.RUNNING,
                    last_event="x",
                    raise_on_failure=True,
                )

"""Unit tests for SupportTrace model."""

from __future__ import annotations

import uuid

from django.test import TestCase

from support_trace.enums import SyncStatus, TraceSource, TraceStatus
from support_trace.models import SupportTrace
from support_trace.tests.support import record_trace_event, setup_trace_context


class SupportTraceModelTests(TestCase):
    def test_create_trace_with_projection_fields(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        result = record_trace_event(clinic, wf_id, correlation_id=corr_id)
        self.assertTrue(result.success)
        trace = SupportTrace.objects.get(pk=result.trace_id)
        self.assertEqual(trace.workflow_instance_id, wf_id)
        self.assertEqual(trace.correlation_id, corr_id)
        self.assertEqual(trace.trace_version, 1)
        self.assertEqual(trace.projection_version, 1)
        self.assertTrue(trace.workflow_fingerprint.startswith("sha256:"))
        self.assertEqual(trace.sync_status, SyncStatus.INDEXED)
        self.assertEqual(trace.last_source, TraceSource.SYSTEM)

    def test_workflow_instance_id_unique(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(clinic, wf_id, correlation_id=corr_id)
        trace = SupportTrace(
            correlation_id=corr_id,
            workflow_instance_id=wf_id,
            workflow_fingerprint="sha256:" + "a" * 64,
            workflow_type="Booking",
            resource_type="Booking",
            resource_id=str(uuid.uuid4()),
            organization_id=str(clinic.id),
            status=TraceStatus.RUNNING,
            last_event="dup",
        )
        with self.assertRaises(Exception):
            trace.save()

    def test_updated_at_changes_on_update(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(clinic, wf_id, correlation_id=corr_id)
        trace = SupportTrace.objects.get(workflow_instance_id=wf_id)
        first_updated = trace.updated_at
        record_trace_event(
            clinic,
            wf_id,
            correlation_id=corr_id,
            status=TraceStatus.COMPLETED,
            last_event="workflow.completed",
            completed_at=trace.started_at,
        )
        trace.refresh_from_db()
        self.assertGreaterEqual(trace.updated_at, first_updated)
        self.assertEqual(trace.trace_version, 2)

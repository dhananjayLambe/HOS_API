"""Unit tests for SupportTraceRepository."""

from __future__ import annotations

import uuid

from django.test import TestCase

from business_audit.enums import BusinessResourceType, WorkflowType
from support_trace.domain.fingerprint import compute_workflow_fingerprint
from support_trace.domain.repository import SupportTraceRepository
from support_trace.enums import SyncStatus, TraceSource, TraceStatus, WorkflowHealth
from support_trace.tests.support import record_trace_event, setup_trace_context


class SupportTraceRepositoryTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def setUp(self) -> None:
        self.repo = SupportTraceRepository()

    def test_upsert_create_then_update(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        res_id = str(uuid.uuid4())
        fp = compute_workflow_fingerprint(
            workflow_instance_id=wf_id,
            workflow_type=WorkflowType.BOOKING,
            resource_id=res_id,
            organization_id=str(clinic.id),
        )
        fields = {
            "correlation_id": corr_id,
            "workflow_instance_id": wf_id,
            "workflow_type": WorkflowType.BOOKING,
            "resource_type": BusinessResourceType.BOOKING,
            "resource_id": res_id,
            "organization_id": str(clinic.id),
            "status": TraceStatus.RUNNING,
            "last_event": "start",
            "workflow_fingerprint": fp,
            "last_source": TraceSource.SYSTEM,
            "sync_status": SyncStatus.INDEXED,
            "workflow_health": WorkflowHealth.HEALTHY,
        }
        trace, created = self.repo.upsert(fields)
        self.assertTrue(created)
        self.assertEqual(trace.trace_version, 1)

        fields["status"] = TraceStatus.COMPLETED
        fields["last_event"] = "done"
        trace2, created2 = self.repo.upsert(fields, expected_trace_version=1)
        self.assertFalse(created2)
        self.assertEqual(trace2.trace_version, 2)

    def test_get_by_correlation(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(clinic, wf_id, correlation_id=corr_id)
        rows = self.repo.get_by_correlation(corr_id)
        self.assertEqual(len(rows), 1)

    def test_find_all_by_identifier_phone(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        phone = "919876543210"
        record_trace_event(
            clinic,
            wf_id,
            correlation_id=corr_id,
            identifiers={"phone_number": phone},
        )
        wf_id2 = str(uuid.uuid4())
        record_trace_event(
            clinic,
            wf_id2,
            correlation_id=corr_id,
            identifiers={"phone_number": phone},
        )
        rows = self.repo.find_all_by_identifier("phone_number", phone)
        self.assertEqual(len(rows), 2)

    def test_find_by_identifier_returns_latest(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        booking_id = str(uuid.uuid4())
        record_trace_event(
            clinic,
            wf_id,
            correlation_id=corr_id,
            identifiers={"booking_id": booking_id},
        )
        row = self.repo.find_by_identifier("booking_id", booking_id)
        self.assertIsNotNone(row)
        self.assertEqual(row.booking_id, booking_id)

    def test_exists(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        self.assertFalse(self.repo.exists(wf_id))
        record_trace_event(clinic, wf_id, correlation_id=corr_id)
        self.assertTrue(self.repo.exists(wf_id))

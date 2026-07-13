"""Integration tests for Support Trace end-to-end flow."""

from __future__ import annotations

import uuid

from django.test import TestCase

from support_trace.domain.repository import SupportTraceRepository
from support_trace.enums import TraceStatus
from support_trace.tests.support import record_trace_event, setup_trace_context


class SupportTraceIntegrationTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_create_update_lookup_chain(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        booking_id = str(uuid.uuid4())
        record_trace_event(
            clinic,
            wf_id,
            correlation_id=corr_id,
            identifiers={"booking_id": booking_id},
            workflow_step="booking.created",
        )
        record_trace_event(
            clinic,
            wf_id,
            correlation_id=corr_id,
            status=TraceStatus.COMPLETED,
            last_event="booking.completed",
            workflow_step="booking.completed",
            identifiers={"booking_id": booking_id},
        )
        repo = SupportTraceRepository()
        by_wf = repo.get_by_workflow(wf_id)
        self.assertIsNotNone(by_wf)
        self.assertEqual(by_wf.status, TraceStatus.COMPLETED)
        self.assertEqual(by_wf.workflow_step, "booking.completed")
        self.assertEqual(by_wf.trace_version, 2)

        by_corr = repo.get_by_correlation(corr_id)
        self.assertEqual(len(by_corr), 1)
        by_booking = repo.find_by_identifier("booking_id", booking_id)
        self.assertEqual(by_booking.workflow_instance_id, wf_id)

    def test_purge_test_data(self) -> None:
        from support_trace.tests.test_utils import purge_test_data

        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(clinic, wf_id, correlation_id=corr_id)
        self.assertEqual(purge_test_data(correlation_id=corr_id), 1)

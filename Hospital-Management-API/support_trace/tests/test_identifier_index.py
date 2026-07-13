"""Tests for identifier indexing."""

from __future__ import annotations

import uuid

from django.test import TestCase

from support_trace.domain.repository import SupportTraceRepository
from support_trace.tests.support import record_trace_event, setup_trace_context


class IdentifierIndexTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_all_identifier_fields_indexed(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        booking_id = str(uuid.uuid4())
        report_id = str(uuid.uuid4())
        record_trace_event(
            clinic,
            wf_id,
            correlation_id=corr_id,
            identifiers={
                "booking_id": booking_id,
                "report_id": report_id,
                "phone_number": "+91 98765 43210",
            },
        )
        repo = SupportTraceRepository()
        by_booking = repo.find_by_identifier("booking_id", booking_id)
        self.assertIsNotNone(by_booking)
        by_report = repo.find_by_identifier("report_id", report_id)
        self.assertIsNotNone(by_report)
        by_phone = repo.find_all_by_identifier("phone_number", "919876543210")
        self.assertEqual(len(by_phone), 1)

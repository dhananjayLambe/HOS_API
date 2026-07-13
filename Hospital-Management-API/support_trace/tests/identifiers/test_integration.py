"""Integration tests for identifier resolution pipeline."""

from __future__ import annotations

import uuid

from django.test import TestCase

from support_trace.identifiers.identifier_lookup_service import IdentifierLookupService
from support_trace.tests.support import record_trace_event, setup_trace_context


class IdentifierIntegrationTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_record_then_lookup_any_with_metadata(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        booking_id = str(uuid.uuid4())
        record_trace_event(
            clinic,
            wf_id,
            correlation_id=corr_id,
            identifiers={"booking_id": booking_id, "phone_number": "919999999999"},
            first_seen_at=None,
            last_seen_at=None,
            identifier_count=2,
        )
        result = IdentifierLookupService.lookup_any(booking_id)
        self.assertEqual(result.trace_count, 1)
        self.assertIsNotNone(result.matched_field)
        self.assertGreater(result.search_time_ms, 0.0)

    def test_lookup_returns_related_by_correlation(self) -> None:
        clinic, corr_id, parent_id = setup_trace_context()
        child_id = str(uuid.uuid4())
        phone = "918888888888"
        record_trace_event(
            clinic,
            parent_id,
            correlation_id=corr_id,
            identifiers={"phone_number": phone},
        )
        record_trace_event(
            clinic,
            child_id,
            correlation_id=corr_id,
            parent_workflow_instance_id=parent_id,
        )
        result = IdentifierLookupService.lookup_any(phone)
        self.assertEqual(result.trace_count, 1)
        self.assertGreaterEqual(result.related_trace_count, 1)

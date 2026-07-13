"""Tests for SupportTraceSearchRepository."""

from __future__ import annotations

import uuid

from django.test import TestCase

from support_trace.identifiers.search_repository import SupportTraceSearchRepository
from support_trace.tests.support import record_trace_event, setup_trace_context


class SearchRepositoryTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_exact_match(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        booking_id = str(uuid.uuid4())
        record_trace_event(
            clinic,
            wf_id,
            correlation_id=corr_id,
            identifiers={"booking_id": booking_id},
        )
        traces = SupportTraceSearchRepository.exact_match("booking_id", booking_id.lower())
        self.assertEqual(len(traces), 1)
        self.assertEqual(traces[0].workflow_instance_id, wf_id)

    def test_prefix_search_bounded(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(
            clinic,
            wf_id,
            correlation_id=corr_id,
            identifiers={"provider_reference": "lab-prefix-123"},
        )
        traces = SupportTraceSearchRepository.prefix_search(
            "provider_reference", "lab-prefix"
        )
        self.assertGreaterEqual(len(traces), 1)

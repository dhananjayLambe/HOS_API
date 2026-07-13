"""Tests for partial search."""

from __future__ import annotations

from django.test import TestCase

from support_trace.identifiers.identifier_lookup_service import IdentifierLookupService
from support_trace.tests.support import record_trace_event, setup_trace_context


class PartialSearchTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_provider_reference_prefix_match(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(
            clinic,
            wf_id,
            correlation_id=corr_id,
            identifiers={"provider_reference": "lab-order-999"},
        )
        result = IdentifierLookupService.lookup_provider_reference("lab-order")
        self.assertGreaterEqual(result.trace_count, 1)

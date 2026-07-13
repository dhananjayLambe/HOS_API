"""M5.3 new typed lookup methods."""

from __future__ import annotations

import uuid

from django.test import TestCase

from support_trace.identifiers import IdentifierLookupService
from support_trace.tests.support import record_trace_event, setup_trace_context


class TypedLookupTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_lookup_encounter(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        enc_id = str(uuid.uuid4())
        record_trace_event(
            clinic, wf_id, correlation_id=corr_id, identifiers={"encounter_id": enc_id}
        )
        result = IdentifierLookupService.lookup_encounter(enc_id)
        self.assertGreaterEqual(result.trace_count, 1)

    def test_lookup_recommendation(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        rec_id = str(uuid.uuid4())
        record_trace_event(
            clinic,
            wf_id,
            correlation_id=corr_id,
            identifiers={"recommendation_id": rec_id},
        )
        result = IdentifierLookupService.lookup_recommendation(rec_id)
        self.assertGreaterEqual(result.trace_count, 1)

    def test_lookup_routing(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        routing_id = str(uuid.uuid4())
        record_trace_event(
            clinic,
            wf_id,
            correlation_id=corr_id,
            identifiers={"routing_id": routing_id},
        )
        result = IdentifierLookupService.lookup_routing(routing_id)
        self.assertGreaterEqual(result.trace_count, 1)

    def test_lookup_prescription(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        rx_id = str(uuid.uuid4())
        record_trace_event(
            clinic,
            wf_id,
            correlation_id=corr_id,
            identifiers={"prescription_id": rx_id},
        )
        result = IdentifierLookupService.lookup_prescription(rx_id)
        self.assertGreaterEqual(result.trace_count, 1)

    def test_lookup_invoice(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        inv_id = str(uuid.uuid4())
        record_trace_event(
            clinic,
            wf_id,
            correlation_id=corr_id,
            identifiers={"invoice_id": inv_id},
        )
        result = IdentifierLookupService.lookup_invoice(inv_id)
        self.assertGreaterEqual(result.trace_count, 1)

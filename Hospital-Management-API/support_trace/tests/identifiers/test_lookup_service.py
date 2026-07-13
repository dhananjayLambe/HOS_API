"""Tests for IdentifierLookupService."""

from __future__ import annotations

import uuid

from django.test import TestCase

from support_trace.identifiers.identifier_lookup_service import IdentifierLookupService
from support_trace.identifiers.types import IdentifierType
from support_trace.tests.support import record_trace_event, setup_trace_context


class LookupServiceTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_lookup_any_phone(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(
            clinic,
            wf_id,
            correlation_id=corr_id,
            identifiers={"phone_number": "919876543210"},
        )
        result = IdentifierLookupService.lookup_any("919876543210")
        self.assertEqual(result.trace_count, 1)
        self.assertEqual(result.detected_type, IdentifierType.PHONE)
        self.assertEqual(result.matched_field, "phone_number")

    def test_lookup_any_whatsapp(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        wamid = "wamid.HBgLtest123"
        record_trace_event(
            clinic,
            wf_id,
            correlation_id=corr_id,
            identifiers={"whatsapp_message_id": wamid},
        )
        result = IdentifierLookupService.lookup_any(wamid)
        self.assertEqual(result.trace_count, 1)
        self.assertEqual(result.detected_type, IdentifierType.WHATSAPP_MESSAGE)

    def test_lookup_booking_typed(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        booking_id = str(uuid.uuid4())
        record_trace_event(
            clinic,
            wf_id,
            correlation_id=corr_id,
            identifiers={"booking_id": booking_id},
        )
        result = IdentifierLookupService.lookup_booking(booking_id)
        self.assertEqual(result.trace_count, 1)
        self.assertEqual(result.matched_field, "booking_id")

"""Identifier certification tests."""

from __future__ import annotations

import uuid

from django.test import TestCase

from support_trace.certification.identifier_validator import IdentifierValidator
from support_trace.tests.support import record_trace_event, setup_trace_context


class IdentifierCertificationTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_validate_booking_id(self) -> None:
        booking_id = str(uuid.uuid4())
        clinic, corr_id, wf_id = setup_trace_context(booking_id=booking_id)
        record_trace_event(
            clinic,
            wf_id,
            correlation_id=corr_id,
            identifiers={"booking_id": booking_id},
        )
        warnings, score = IdentifierValidator.validate(booking_id=booking_id)
        self.assertEqual(score, 1.0)

    def test_validate_correlation_id(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(clinic, wf_id, correlation_id=corr_id)
        warnings, score = IdentifierValidator.validate(correlation_id=corr_id)
        self.assertEqual(score, 1.0)

    def test_validate_no_identifiers(self) -> None:
        warnings, score = IdentifierValidator.validate()
        self.assertEqual(score, 0.0)

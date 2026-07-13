"""Incident certification tests."""

from __future__ import annotations

from django.test import TestCase

from support_trace.certification.incident_validator import IncidentValidator
from support_trace.tests.incident.support import setup_booking_chain


class IncidentCertificationTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_validate_booking_incident(self) -> None:
        _clinic, _corr_id, _wf_id, booking_id, _trace = setup_booking_chain()
        warnings, score = IncidentValidator.validate(booking_id)
        self.assertGreaterEqual(score, 0.0)

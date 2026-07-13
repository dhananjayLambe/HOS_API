"""Performance certification tests."""

from __future__ import annotations

from django.test import TestCase

from support_trace.certification.performance_validator import PerformanceValidator
from support_trace.tests.incident.support import setup_booking_chain


class PerformanceCertificationTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_validate_performance(self) -> None:
        _clinic, _corr_id, wf_id, booking_id, _trace = setup_booking_chain()
        warnings, score = PerformanceValidator.validate(
            workflow_id=wf_id,
            booking_id=booking_id,
        )
        self.assertGreaterEqual(score, 0.5)

    def test_runtime_capture_performance(self) -> None:
        warnings, score = PerformanceValidator.validate()
        self.assertGreaterEqual(score, 0.5)

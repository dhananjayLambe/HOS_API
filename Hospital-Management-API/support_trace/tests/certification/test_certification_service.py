"""Certification service orchestration tests."""

from __future__ import annotations

from django.test import TestCase

from support_trace.certification.certification_service import CertificationService
from support_trace.tests.incident.support import setup_booking_chain


class CertificationServiceTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_run_platform_certification(self) -> None:
        _clinic, corr_id, wf_id, booking_id, _trace = setup_booking_chain()
        report = CertificationService.run(
            scope="platform",
            workflow_id=wf_id,
            booking_id=booking_id,
            correlation_id=corr_id,
        )
        self.assertIn(report.certification_status, ("PASS", "WARN", "FAIL"))
        self.assertGreaterEqual(report.overall_score, 0.0)
        self.assertGreater(report.duration_ms, 0.0)

    def test_run_without_performance(self) -> None:
        _clinic, corr_id, wf_id, booking_id, _trace = setup_booking_chain()
        report = CertificationService.run(
            include_performance=False,
            workflow_id=wf_id,
            booking_id=booking_id,
            correlation_id=corr_id,
        )
        self.assertEqual(report.performance_score, 1.0)

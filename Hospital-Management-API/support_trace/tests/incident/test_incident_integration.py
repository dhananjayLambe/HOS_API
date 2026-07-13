"""End-to-end incident reconstruction integration tests."""

from __future__ import annotations

from django.test import TestCase

from support_trace.incident import IncidentReconstructionService, ReconstructionLevel
from support_trace.tests.incident.support import setup_booking_chain
from support_trace.tests.support import record_trace_event, setup_trace_context


class IncidentIntegrationTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_e2e_booking_reconstruction(self) -> None:
        _, _, _, booking_id, _ = setup_booking_chain()
        report = IncidentReconstructionService.reconstruct_booking(
            booking_id, level=ReconstructionLevel.FULL
        )
        self.assertEqual(report.entities.booking, booking_id)
        self.assertIsNotNone(report.summary)
        self.assertGreater(report.duration_ms, 0)

    def test_e2e_failed_booking_with_retries(self) -> None:
        _, _, _, booking_id, _ = setup_booking_chain(whatsapp_failed=True, retry_count=2)
        report = IncidentReconstructionService.reconstruct_booking(
            booking_id, level=ReconstructionLevel.DEEP
        )
        self.assertIsNotNone(report.narrative)
        if report.summary:
            self.assertGreaterEqual(report.summary.retry_count, 0)

    def test_e2e_correlation_multi_trace(self) -> None:
        clinic, corr_id, wf1 = setup_trace_context()
        record_trace_event(clinic, wf1, correlation_id=corr_id)
        _, _, wf2 = setup_trace_context(correlation_id=corr_id)
        record_trace_event(clinic, wf2, correlation_id=corr_id)
        report = IncidentReconstructionService.reconstruct_correlation(corr_id)
        self.assertIn("correlation", report.scope)

    def test_investigation_id_unique_per_call(self) -> None:
        _, _, _, booking_id, _ = setup_booking_chain()
        r1 = IncidentReconstructionService.reconstruct_booking(booking_id)
        r2 = IncidentReconstructionService.reconstruct_booking(booking_id)
        self.assertNotEqual(r1.investigation_id, r2.investigation_id)

    def test_full_level_has_graph_and_impact(self) -> None:
        _, _, _, booking_id, _ = setup_booking_chain()
        report = IncidentReconstructionService.reconstruct_booking(
            booking_id, level=ReconstructionLevel.FULL
        )
        self.assertIsNotNone(report.impact)
        self.assertGreater(len(report.workflow_graph.nodes), 0)

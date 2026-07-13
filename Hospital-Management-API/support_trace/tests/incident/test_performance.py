"""Incident reconstruction performance tests — soft SLA asserts."""

from __future__ import annotations

from django.test import TestCase

from support_trace.incident import IncidentReconstructionService, ReconstructionLevel
from support_trace.incident.constants import PERFORMANCE_TARGETS_MS
from support_trace.tests.incident.support import setup_booking_chain
from support_trace.tests.support import record_trace_event, setup_trace_context


class PerformanceTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_booking_reconstruction_under_target(self) -> None:
        _, _, _, booking_id, _ = setup_booking_chain()
        report = IncidentReconstructionService.reconstruct_booking(booking_id)
        target = PERFORMANCE_TARGETS_MS["booking"]
        self.assertLess(report.duration_ms, target * 5)

    def test_workflow_reconstruction_under_target(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(clinic, wf_id, correlation_id=corr_id)
        report = IncidentReconstructionService.reconstruct_workflow(wf_id)
        target = PERFORMANCE_TARGETS_MS["workflow"]
        self.assertLess(report.duration_ms, target * 5)

    def test_correlation_reconstruction_under_target(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(clinic, wf_id, correlation_id=corr_id)
        report = IncidentReconstructionService.reconstruct_correlation(corr_id)
        target = PERFORMANCE_TARGETS_MS["correlation"]
        self.assertLess(report.duration_ms, target * 5)

    def test_deep_investigation_under_target(self) -> None:
        _, _, _, booking_id, _ = setup_booking_chain()
        report = IncidentReconstructionService.reconstruct_booking(
            booking_id, level=ReconstructionLevel.DEEP
        )
        target = PERFORMANCE_TARGETS_MS["deep"]
        self.assertLess(report.duration_ms, target * 5)

    def test_reconstruct_any_under_target(self) -> None:
        _, _, _, booking_id, _ = setup_booking_chain()
        report = IncidentReconstructionService.reconstruct_any(booking_id)
        target = PERFORMANCE_TARGETS_MS["reconstruct_any"]
        self.assertLess(report.duration_ms, target * 5)

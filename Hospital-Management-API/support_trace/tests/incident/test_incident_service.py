"""IncidentReconstructionService public API tests."""

from __future__ import annotations

import uuid

from django.test import TestCase

from support_trace.incident import IncidentReconstructionService, IncidentReport, ReconstructionLevel
from support_trace.tests.incident.support import setup_booking_chain
from support_trace.tests.support import record_trace_event, setup_trace_context


class IncidentServiceTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_reconstruct_booking_returns_report(self) -> None:
        _, _, _, booking_id, _ = setup_booking_chain()
        report = IncidentReconstructionService.reconstruct_booking(booking_id)
        self.assertIsInstance(report, IncidentReport)
        self.assertTrue(report.investigation_id)
        self.assertEqual(report.entities.booking, booking_id)

    def test_reconstruct_any_by_booking_id(self) -> None:
        _, _, _, booking_id, _ = setup_booking_chain()
        report = IncidentReconstructionService.reconstruct_any(booking_id)
        self.assertIsInstance(report, IncidentReport)

    def test_reconstruct_workflow(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(clinic, wf_id, correlation_id=corr_id)
        report = IncidentReconstructionService.reconstruct_workflow(wf_id)
        self.assertEqual(report.primary_workflow, wf_id)

    def test_reconstruct_correlation(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(clinic, wf_id, correlation_id=corr_id)
        report = IncidentReconstructionService.reconstruct_correlation(corr_id)
        self.assertIn("correlation", report.scope)

    def test_reconstruct_report(self) -> None:
        report_id = str(uuid.uuid4())
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(
            clinic, wf_id, correlation_id=corr_id,
            identifiers={"report_id": report_id},
        )
        report = IncidentReconstructionService.reconstruct_report(report_id)
        self.assertIsInstance(report, IncidentReport)

    def test_reconstruct_patient(self) -> None:
        patient_id = str(uuid.uuid4())
        clinic, corr_id, wf_id = setup_trace_context(patient_account_id=patient_id)
        record_trace_event(
            clinic, wf_id, correlation_id=corr_id,
            identifiers={"patient_account_id": patient_id},
        )
        report = IncidentReconstructionService.reconstruct_patient(patient_id)
        self.assertIsInstance(report, IncidentReport)

    def test_basic_level_minimal_output(self) -> None:
        _, _, _, booking_id, _ = setup_booking_chain()
        report = IncidentReconstructionService.reconstruct_booking(
            booking_id, level=ReconstructionLevel.BASIC
        )
        self.assertIsNone(report.failure)
        self.assertIsNone(report.summary)

    def test_deep_level_includes_narrative(self) -> None:
        _, _, _, booking_id, _ = setup_booking_chain()
        report = IncidentReconstructionService.reconstruct_booking(
            booking_id, level=ReconstructionLevel.DEEP
        )
        self.assertIsNotNone(report.narrative)
        self.assertIsInstance(report.recommendations, tuple)

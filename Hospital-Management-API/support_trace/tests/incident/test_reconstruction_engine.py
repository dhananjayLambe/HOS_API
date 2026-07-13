"""ReconstructionEngine pipeline tests."""

from __future__ import annotations

from django.test import TestCase

from support_trace.incident import ReconstructionLevel
from support_trace.incident.investigation_context import IncidentContext
from support_trace.incident.reconstruction_engine import ReconstructionEngine
from support_trace.lookup import TraceLookupService
from support_trace.tests.incident.support import setup_booking_chain


class ReconstructionEngineTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_full_pipeline(self) -> None:
        _, _, _, booking_id, _ = setup_booking_chain()
        ctx = IncidentContext.create(f"booking:{booking_id}", level=ReconstructionLevel.FULL)
        report = ReconstructionEngine.reconstruct(
            ctx, TraceLookupService.lookup_by_booking, booking_id
        )
        self.assertIsNotNone(report.summary)
        self.assertIsNotNone(report.failure)
        self.assertIsNotNone(report.duration)
        self.assertGreater(len(report.workflow_graph.nodes), 0)

    def test_missing_resource_partial(self) -> None:
        ctx = IncidentContext.create("booking:nonexistent-uuid", level=ReconstructionLevel.FULL)
        report = ReconstructionEngine.reconstruct(
            ctx, TraceLookupService.lookup_by_booking, "nonexistent-uuid-00000000"
        )
        self.assertTrue(report.partial or report.primary_workflow is None)

    def test_standard_includes_summary_only(self) -> None:
        _, _, _, booking_id, _ = setup_booking_chain()
        ctx = IncidentContext.create(f"booking:{booking_id}", level=ReconstructionLevel.STANDARD)
        report = ReconstructionEngine.reconstruct(
            ctx, TraceLookupService.lookup_by_booking, booking_id
        )
        self.assertIsNotNone(report.summary)
        self.assertIsNone(report.failure)

    def test_investigation_id_preserved(self) -> None:
        _, _, _, booking_id, _ = setup_booking_chain()
        inv_id = "test-inv-123"
        ctx = IncidentContext.create(
            f"booking:{booking_id}", investigation_id=inv_id
        )
        report = ReconstructionEngine.reconstruct(
            ctx, TraceLookupService.lookup_by_booking, booking_id
        )
        self.assertEqual(report.investigation_id, inv_id)

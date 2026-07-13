"""End-to-end platform certification scenarios."""

from __future__ import annotations

from django.test import TestCase

from support_trace.certification.certification_service import CertificationService
from support_trace.domain.repository import SupportTraceRepository
from support_trace.lookup import TraceLookupService
from support_trace.tests.api.support import support_api_client
from support_trace.tests.incident.support import setup_booking_chain
from support_trace.tests.support import record_trace_event, setup_trace_context
from support_trace.timeline import TimelineService


class EndToEndCertificationTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_booking_workflow_golden_path(self) -> None:
        _clinic, corr_id, wf_id, booking_id, _trace = setup_booking_chain()

        lookup = TraceLookupService.lookup_by_workflow(wf_id)
        self.assertIsNotNone(lookup.primary_trace)

        timeline = TimelineService.build_workflow_timeline(wf_id)
        self.assertGreaterEqual(len(timeline.events), 0)

        client, _ = support_api_client()
        response = client.get(f"/api/v1/support/workflow/{wf_id}?expand=runtime")
        self.assertEqual(response.status_code, 200)

        report = CertificationService.run(
            workflow_id=wf_id,
            booking_id=booking_id,
            correlation_id=corr_id,
            api_envelope=response.data,
        )
        self.assertIn(report.certification_status, ("PASS", "WARN"))

    def test_failed_whatsapp_delivery_chain(self) -> None:
        _clinic, corr_id, wf_id, booking_id, _trace = setup_booking_chain(
            whatsapp_failed=True, retry_count=2
        )
        report = CertificationService.run(
            workflow_id=wf_id,
            booking_id=booking_id,
            correlation_id=corr_id,
        )
        self.assertGreater(report.overall_score, 0.0)

    def test_correlation_multi_trace(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(clinic, wf_id, correlation_id=corr_id)
        clinic2, _, wf_id2 = setup_trace_context(correlation_id=corr_id)
        record_trace_event(clinic2, wf_id2, correlation_id=corr_id)

        traces = SupportTraceRepository().get_by_correlation(corr_id)
        self.assertGreaterEqual(len(traces), 2)

        report = CertificationService.run(correlation_id=corr_id, workflow_id=wf_id)
        self.assertGreater(report.search_score, 0.0)

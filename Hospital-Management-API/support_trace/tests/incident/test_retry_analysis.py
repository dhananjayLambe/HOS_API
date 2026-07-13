"""Retry analysis tests."""

from __future__ import annotations

from django.test import SimpleTestCase

from support_trace.incident.investigation_context import IncidentContext
from support_trace.incident.retry_analysis import RetryAnalysisEngine
from support_trace.lookup.types import InvestigationTimeline, TraceLookupResult
from support_trace.tests.incident.support import make_timeline_event
from support_trace.timeline.types import TimelineResult


class RetryAnalysisTests(SimpleTestCase):
    def _ctx(self) -> IncidentContext:
        return IncidentContext.create("test:scope")

    def _trace(self, retry_count: int, status: str = "Completed"):
        class Trace:
            pass

        t = Trace()
        t.workflow_instance_id = "wf-1"
        t.workflow_type = "WhatsAppDelivery"
        t.retry_count = retry_count
        t.status = status
        t.last_event = "whatsapp.retry"
        t.last_event_at = None
        return t

    def test_retry_counting(self) -> None:
        trace = self._trace(3)
        lookup = TraceLookupResult(primary_trace=trace)
        result = RetryAnalysisEngine.analyze(self._ctx(), lookup)
        self.assertGreaterEqual(result.total_retries, 3)

    def test_retry_ordering(self) -> None:
        trace = self._trace(2)
        lookup = TraceLookupResult(primary_trace=trace)
        result = RetryAnalysisEngine.analyze(self._ctx(), lookup)
        sequences = [e.sequence for e in result.events]
        self.assertEqual(sequences, sorted(sequences))

    def test_retry_outcomes(self) -> None:
        trace = self._trace(2, status="Completed")
        lookup = TraceLookupResult(primary_trace=trace)
        result = RetryAnalysisEngine.analyze(self._ctx(), lookup)
        self.assertTrue(any(e.succeeded for e in result.events))

    def test_retry_from_timeline_tags(self) -> None:
        event = make_timeline_event(
            event="retry",
            category="Communication",
            severity="INFO",
            tags=("retry", "whatsapp"),
            workflow_type="WhatsAppDelivery",
            workflow_instance_id="wf-wa",
            summary="Retry attempt",
            action="whatsapp.retry",
        )
        timeline = InvestigationTimeline(result=TimelineResult(events=[event]))
        lookup = TraceLookupResult(timeline=timeline)
        result = RetryAnalysisEngine.analyze(self._ctx(), lookup)
        self.assertGreater(result.total_retries, 0)

    def test_by_workflow_breakdown(self) -> None:
        trace = self._trace(2)
        lookup = TraceLookupResult(primary_trace=trace)
        result = RetryAnalysisEngine.analyze(self._ctx(), lookup)
        self.assertIn("WhatsAppDelivery", result.by_workflow)

    def test_retry_workflow_types_constant(self) -> None:
        types = RetryAnalysisEngine.retry_workflow_types()
        self.assertIn("WhatsAppDelivery", types)

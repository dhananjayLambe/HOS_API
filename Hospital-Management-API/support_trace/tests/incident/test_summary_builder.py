"""Incident summary builder tests."""

from __future__ import annotations

from django.test import SimpleTestCase

from support_trace.incident.summary_builder import IncidentSummaryBuilder
from support_trace.incident.types import DurationAnalysis, FailureAnalysis, ImpactAnalysis, RetryAnalysis
from support_trace.lookup.types import TraceLookupResult


class SummaryBuilderTests(SimpleTestCase):
    def _trace(self, status: str = "Completed", retry_count: int = 0):
        class Trace:
            pass

        t = Trace()
        t.status = status
        t.workflow_type = "Booking"
        t.retry_count = retry_count
        return t

    def test_completed_status(self) -> None:
        lookup = TraceLookupResult(primary_trace=self._trace("Completed"))
        summary = IncidentSummaryBuilder.build(lookup)
        self.assertTrue(summary.completed)
        self.assertFalse(summary.has_failure)

    def test_failed_status(self) -> None:
        lookup = TraceLookupResult(primary_trace=self._trace("Failed"))
        failure = FailureAnalysis(failure_stage="Booking", failure_reason="timeout")
        summary = IncidentSummaryBuilder.build(lookup, failure=failure)
        self.assertTrue(summary.has_failure)

    def test_retry_count(self) -> None:
        lookup = TraceLookupResult(primary_trace=self._trace("Completed", retry_count=2))
        retry = RetryAnalysis(total_retries=2, by_workflow={"Booking": 2})
        summary = IncidentSummaryBuilder.build(lookup, retry=retry)
        self.assertEqual(summary.retry_count, 2)

    def test_affected_resources(self) -> None:
        lookup = TraceLookupResult(primary_trace=self._trace())
        impact = ImpactAnalysis(affected_bookings=("b1", "b2"))
        summary = IncidentSummaryBuilder.build(lookup, impact=impact)
        self.assertEqual(summary.affected_resources, 2)

    def test_duration_display(self) -> None:
        lookup = TraceLookupResult(primary_trace=self._trace())
        duration = DurationAnalysis(total_display="28 min")
        summary = IncidentSummaryBuilder.build(lookup, duration=duration)
        self.assertEqual(summary.duration_display, "28 min")

    def test_failure_stage_in_summary(self) -> None:
        failure = FailureAnalysis(failure_stage="Routing", failure_reason="timeout")
        lookup = TraceLookupResult(primary_trace=self._trace("Failed"))
        summary = IncidentSummaryBuilder.build(lookup, failure=failure)
        self.assertEqual(summary.failure_stage, "Routing")

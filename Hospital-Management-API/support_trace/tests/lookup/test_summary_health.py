"""Summary and health builder tests."""

from __future__ import annotations

from django.test import SimpleTestCase
from unittest.mock import MagicMock

from support_trace.lookup.enums import InvestigationHealth
from support_trace.lookup.health_builder import HealthBuilder
from support_trace.lookup.summary_builder import SummaryBuilder
from support_trace.lookup.types import InvestigationTimeline
from support_trace.timeline.types import TimelineResult, TimelineStatistics


class SummaryBuilderTests(SimpleTestCase):
    def test_structured_includes_next_step(self) -> None:
        trace = MagicMock()
        trace.workflow_type = "Booking"
        trace.current_state = "Created"
        trace.status = "Running"
        trace.workflow_step = "Created"
        trace.started_at = None
        trace.completed_at = None
        trace.duration_ms = 60000
        trace.retry_count = 0
        trace.patient_account_id = "patient-123"
        trace.laboratory_id = None
        trace.branch_id = None
        timeline = InvestigationTimeline(
            result=TimelineResult(statistics=TimelineStatistics(failed_events=0))
        )
        summary = SummaryBuilder.build(trace, timeline, None)
        self.assertEqual(summary.structured.next_expected_step, "Booking Confirmed")
        self.assertIn("Booking", summary.narrative.text)


class HealthBuilderTests(SimpleTestCase):
    def test_failed_trace_attention_required(self) -> None:
        trace = MagicMock()
        trace.status = "Failed"
        trace.retry_count = 0
        trace.workflow_type = "Booking"
        trace.workflow_health = ""
        trace.duration_ms = None
        trace.provider_reference = None
        health = HealthBuilder.evaluate(trace, None)
        self.assertEqual(health.workflow, InvestigationHealth.ATTENTION_REQUIRED)

    def test_high_retry_retrying(self) -> None:
        trace = MagicMock()
        trace.status = "Running"
        trace.retry_count = 5
        trace.workflow_type = "Booking"
        trace.workflow_health = ""
        trace.duration_ms = None
        trace.provider_reference = None
        health = HealthBuilder.evaluate(trace, None)
        self.assertEqual(health.workflow, InvestigationHealth.RETRYING)

"""Workflow duration analysis tests."""

from __future__ import annotations

from django.test import SimpleTestCase

from support_trace.incident.investigation_context import IncidentContext
from support_trace.incident.workflow_duration import WorkflowDurationEngine
from support_trace.lookup.types import InvestigationTimeline, TraceLookupResult
from support_trace.timeline.types import TimelineResult, TimelineStatistics


class DurationTests(SimpleTestCase):
    def _ctx(self) -> IncidentContext:
        return IncidentContext.create("test:scope")

    def _trace(self, wf_type: str, duration_ms: int):
        class Trace:
            pass

        t = Trace()
        t.workflow_instance_id = f"wf-{wf_type}"
        t.workflow_type = wf_type
        t.duration_ms = duration_ms
        t.workflow_depth = 0
        return t

    def test_stage_duration(self) -> None:
        trace = self._trace("Booking", 180000)
        lookup = TraceLookupResult(primary_trace=trace)
        result = WorkflowDurationEngine.analyze(self._ctx(), lookup)
        self.assertGreater(len(result.stages), 0)
        self.assertEqual(result.stages[0].duration_ms, 180000)

    def test_total_duration_from_timeline(self) -> None:
        timeline = InvestigationTimeline(
            result=TimelineResult(statistics=TimelineStatistics(timeline_duration_ms=1680000))
        )
        trace = self._trace("Booking", 180000)
        lookup = TraceLookupResult(primary_trace=trace, timeline=timeline)
        result = WorkflowDurationEngine.analyze(self._ctx(), lookup)
        self.assertEqual(result.total_duration_ms, 1680000)

    def test_sla_breach_detection(self) -> None:
        trace = self._trace("Routing", 20 * 60 * 1000)
        lookup = TraceLookupResult(primary_trace=trace)
        result = WorkflowDurationEngine.analyze(self._ctx(), lookup)
        routing_stages = [s for s in result.stages if s.stage == "Routing"]
        if routing_stages:
            self.assertTrue(routing_stages[0].sla_breached)

    def test_format_duration_minutes(self) -> None:
        display = WorkflowDurationEngine._format_duration(180000)
        self.assertIn("min", display)

    def test_format_duration_ms(self) -> None:
        display = WorkflowDurationEngine._format_duration(500)
        self.assertIn("ms", display)

    def test_empty_lookup(self) -> None:
        lookup = TraceLookupResult()
        result = WorkflowDurationEngine.analyze(self._ctx(), lookup)
        self.assertEqual(result.total_display, "—")

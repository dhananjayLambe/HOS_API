"""Failure analysis engine tests."""

from __future__ import annotations

from django.test import SimpleTestCase

from support_trace.incident.enums import FailureType
from support_trace.incident.failure_analysis import FailureAnalysisEngine
from support_trace.incident.investigation_context import IncidentContext
from support_trace.lookup.enums import ErrorClassification
from support_trace.lookup.types import InvestigationTimeline, TraceLookupResult
from support_trace.tests.incident.support import make_timeline_event
from support_trace.timeline.types import TimelineResult


class FailureAnalysisTests(SimpleTestCase):
    def _ctx(self) -> IncidentContext:
        return IncidentContext.create("test:scope")

    def _failed_trace(self):
        class Trace:
            status = "Failed"
            workflow_type = "Routing"
            workflow_instance_id = "wf-routing-1"
            last_event = "routing.timeout"
            completed_at = None
            last_event_at = None

        return Trace()

    def test_routing_failure_detection(self) -> None:
        trace = self._failed_trace()
        lookup = TraceLookupResult(
            primary_trace=trace,
            error_classification=ErrorClassification.INFRASTRUCTURE,
        )
        result = FailureAnalysisEngine.analyze(self._ctx(), lookup)
        self.assertTrue(result.has_failure)
        self.assertEqual(result.failure_stage, "Routing")

    def test_whatsapp_failure_from_event(self) -> None:
        event = make_timeline_event(
            event="delivery.failed",
            category="Communication",
            severity="Error",
            tags=("whatsapp", "provider"),
            workflow_type="WhatsAppDelivery",
            workflow_instance_id="wf-wa-1",
            summary="Meta timeout",
            action="whatsapp.send.failed",
        )
        timeline = InvestigationTimeline(
            result=TimelineResult(events=[event])
        )
        lookup = TraceLookupResult(
            timeline=timeline,
            error_classification=ErrorClassification.PROVIDER,
        )
        result = FailureAnalysisEngine.analyze(self._ctx(), lookup)
        self.assertTrue(result.has_failure)
        self.assertIn("timeout", (result.failure_reason or "").lower())

    def test_no_failure_on_healthy(self) -> None:
        class Trace:
            status = "Completed"
            workflow_type = "Booking"
            workflow_instance_id = "wf-1"

        lookup = TraceLookupResult(primary_trace=Trace())
        result = FailureAnalysisEngine.analyze(self._ctx(), lookup)
        self.assertFalse(result.has_failure)

    def test_timeout_classification(self) -> None:
        event = make_timeline_event(
            event="timeout",
            category="Routing",
            severity="Critical",
            tags=("routing",),
            workflow_type="Routing",
            workflow_instance_id="wf-r",
            summary="Price service timeout",
            action="routing.price.timeout",
        )
        timeline = InvestigationTimeline(result=TimelineResult(events=[event]))
        lookup = TraceLookupResult(timeline=timeline)
        result = FailureAnalysisEngine.analyze(self._ctx(), lookup)
        self.assertEqual(result.failure_type, FailureType.TIMEOUT)

    def test_delivery_failure(self) -> None:
        event = make_timeline_event(
            event="delivery.failed",
            category="ReportDelivery",
            severity="Error",
            workflow_type="ReportDelivery",
            workflow_instance_id="wf-d",
            summary="Delivery failed",
            action="delivery.failed",
        )
        timeline = InvestigationTimeline(result=TimelineResult(events=[event]))
        lookup = TraceLookupResult(timeline=timeline)
        result = FailureAnalysisEngine.analyze(self._ctx(), lookup)
        self.assertTrue(result.has_failure)

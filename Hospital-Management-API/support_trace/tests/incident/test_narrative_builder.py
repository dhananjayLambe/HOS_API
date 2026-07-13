"""Narrative builder tests."""

from __future__ import annotations

from django.test import SimpleTestCase

from support_trace.incident.narrative_builder import NarrativeBuilder
from support_trace.incident.types import DurationAnalysis, FailureAnalysis, RetryAnalysis
from support_trace.lookup.types import InvestigationSummary, NarrativeSummary, StructuredSummary, TraceLookupResult


class NarrativeBuilderTests(SimpleTestCase):
    def _trace(self, wf_type: str, status: str):
        class Trace:
            pass

        t = Trace()
        t.workflow_type = wf_type
        t.status = status
        t.workflow_instance_id = f"wf-{wf_type}"
        t.workflow_depth = 0
        t.last_event = f"{wf_type.lower()}.failed" if status == "Failed" else f"{wf_type.lower()}.completed"
        return t

    def test_deterministic_completed_narrative(self) -> None:
        trace = self._trace("Booking", "Completed")
        lookup = TraceLookupResult(primary_trace=trace)
        narrative = NarrativeBuilder.build(lookup)
        self.assertIn("Booking", narrative)
        self.assertIn("completed", narrative.lower())

    def test_failed_narrative(self) -> None:
        trace = self._trace("Routing", "Failed")
        failure = FailureAnalysis(
            failure_stage="Routing",
            failure_reason="Price service timeout",
        )
        lookup = TraceLookupResult(primary_trace=trace)
        narrative = NarrativeBuilder.build(lookup, failure=failure)
        self.assertIn("fail", narrative.lower())

    def test_retry_narrative(self) -> None:
        trace = self._trace("WhatsAppDelivery", "Completed")
        retry = RetryAnalysis(
            total_retries=2,
            by_workflow={"WhatsAppDelivery": 2},
            events=(),
        )
        lookup = TraceLookupResult(primary_trace=trace)
        narrative = NarrativeBuilder.build(lookup, retry=retry)
        self.assertIn("retri", narrative.lower())

    def test_duration_appended(self) -> None:
        trace = self._trace("Booking", "Completed")
        lookup = TraceLookupResult(primary_trace=trace)
        duration = DurationAnalysis(total_display="28 min")
        narrative = NarrativeBuilder.build(lookup, duration=duration)
        self.assertIn("28 min", narrative)

    def test_uses_lookup_summary_when_present(self) -> None:
        lookup = TraceLookupResult(
            summary=InvestigationSummary(
                structured=StructuredSummary(
                    workflow_type="Booking",
                    current_status="Completed",
                    current_step=None,
                    next_expected_step=None,
                    started_at=None,
                    completed_at=None,
                    duration_display="5 min",
                    retry_count=0,
                    failure_count=0,
                    patient_label=None,
                    owner_label=None,
                ),
                narrative=NarrativeSummary(text="Consultation completed successfully."),
            )
        )
        narrative = NarrativeBuilder.build(lookup)
        self.assertIn("Consultation", narrative)

    def test_empty_lookup_message(self) -> None:
        lookup = TraceLookupResult()
        narrative = NarrativeBuilder.build(lookup)
        self.assertIn("No incident", narrative)

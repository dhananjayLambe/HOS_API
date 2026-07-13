"""Impact analysis tests."""

from __future__ import annotations

from django.test import SimpleTestCase

from support_trace.incident.impact_analysis import ImpactAnalysisEngine
from support_trace.incident.investigation_context import IncidentContext
from support_trace.lookup.types import IdentifierCollection, TraceLookupResult


class ImpactAnalysisTests(SimpleTestCase):
    def _ctx(self) -> IncidentContext:
        return IncidentContext.create("test:scope")

    def _trace(self, **kwargs):
        class Trace:
            pass

        t = Trace()
        t.workflow_instance_id = kwargs.get("workflow_instance_id", "wf-1")
        t.workflow_type = kwargs.get("workflow_type", "Booking")
        t.patient_account_id = kwargs.get("patient_account_id")
        t.booking_id = kwargs.get("booking_id")
        t.recommendation_id = kwargs.get("recommendation_id")
        t.report_id = kwargs.get("report_id")
        t.payment_id = kwargs.get("payment_id")
        t.whatsapp_message_id = kwargs.get("whatsapp_message_id")
        t.provider_reference = kwargs.get("provider_reference")
        t.laboratory_id = kwargs.get("laboratory_id")
        return t

    def test_affected_booking(self) -> None:
        trace = self._trace(booking_id="book-1")
        lookup = TraceLookupResult(primary_trace=trace)
        result = ImpactAnalysisEngine.analyze(self._ctx(), lookup)
        self.assertIn("book-1", result.affected_bookings)

    def test_affected_patient(self) -> None:
        trace = self._trace(patient_account_id="pat-1")
        lookup = TraceLookupResult(primary_trace=trace)
        result = ImpactAnalysisEngine.analyze(self._ctx(), lookup)
        self.assertIn("pat-1", result.affected_patients)

    def test_downstream_workflows(self) -> None:
        primary = self._trace(workflow_instance_id="wf-primary")
        related = self._trace(workflow_instance_id="wf-child", workflow_type="Routing")
        class LookupResult:
            traces = [primary]
            related_traces = [related]

        lookup = TraceLookupResult(
            primary_trace=primary,
        )
        lookup.identifier_lookup = LookupResult()
        result = ImpactAnalysisEngine.analyze(self._ctx(), lookup)
        self.assertIn("wf-child", result.downstream_workflows)

    def test_affected_resource_count(self) -> None:
        trace = self._trace(booking_id="b1", patient_account_id="p1", report_id="r1")
        lookup = TraceLookupResult(
            primary_trace=trace,
            identifiers=IdentifierCollection(
                by_field={"booking_id": "b1", "patient_account_id": "p1", "report_id": "r1"},
                entries=(),
            ),
        )
        result = ImpactAnalysisEngine.analyze(self._ctx(), lookup)
        self.assertGreaterEqual(result.affected_resource_count, 2)

    def test_affected_messages(self) -> None:
        trace = self._trace(whatsapp_message_id="wamid.123")
        lookup = TraceLookupResult(primary_trace=trace)
        result = ImpactAnalysisEngine.analyze(self._ctx(), lookup)
        self.assertIn("wamid.123", result.affected_messages)

    def test_affected_providers(self) -> None:
        trace = self._trace(provider_reference="PROV-1", laboratory_id="lab-1")
        lookup = TraceLookupResult(primary_trace=trace)
        result = ImpactAnalysisEngine.analyze(self._ctx(), lookup)
        self.assertGreater(len(result.affected_providers), 0)

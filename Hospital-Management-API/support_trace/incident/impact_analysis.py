"""Impact analysis engine — pluggable."""

from __future__ import annotations

from typing import Any

from support_trace.incident.investigation_context import IncidentContext
from support_trace.incident.types import ImpactAnalysis
from support_trace.lookup.types import TraceLookupResult
from support_trace.incident.relationship_engine import RelationshipEngine


class ImpactAnalysisEngine:
    @classmethod
    def analyze(cls, ctx: IncidentContext, lookup: TraceLookupResult) -> ImpactAnalysis:
        patients: set[str] = set()
        bookings: set[str] = set()
        recommendations: set[str] = set()
        reports: set[str] = set()
        payments: set[str] = set()
        messages: set[str] = set()
        providers: set[str] = set()
        downstream: list[str] = []

        traces = RelationshipEngine.expand_journey(lookup)
        primary_wf = (
            str(getattr(lookup.primary_trace, "workflow_instance_id", ""))
            if lookup.primary_trace
            else None
        )

        for trace in traces:
            wf_id = str(getattr(trace, "workflow_instance_id", "") or "")
            if wf_id and wf_id != primary_wf:
                downstream.append(wf_id)
            cls._collect_ids(trace, patients, bookings, recommendations, reports, payments, messages, providers)

        if lookup.identifiers:
            by_field = lookup.identifiers.by_field
            if pid := by_field.get("patient_account_id"):
                patients.add(pid)
            if bid := by_field.get("booking_id"):
                bookings.add(bid)
            if rid := by_field.get("recommendation_id"):
                recommendations.add(rid)
            if rep := by_field.get("report_id"):
                reports.add(rep)
            if pay := by_field.get("payment_id"):
                payments.add(pay)
            if msg := by_field.get("whatsapp_message_id"):
                messages.add(msg)
            if prov := by_field.get("provider_reference"):
                providers.add(prov)
            if lab := by_field.get("laboratory_id"):
                providers.add(lab)

        return ImpactAnalysis(
            affected_patients=tuple(sorted(patients)),
            affected_bookings=tuple(sorted(bookings)),
            affected_recommendations=tuple(sorted(recommendations)),
            affected_reports=tuple(sorted(reports)),
            affected_payments=tuple(sorted(payments)),
            affected_messages=tuple(sorted(messages)),
            affected_providers=tuple(sorted(providers)),
            downstream_workflows=tuple(downstream),
        )

    @staticmethod
    def _collect_ids(
        trace: Any,
        patients: set[str],
        bookings: set[str],
        recommendations: set[str],
        reports: set[str],
        payments: set[str],
        messages: set[str],
        providers: set[str],
    ) -> None:
        if v := getattr(trace, "patient_account_id", None):
            patients.add(str(v))
        if v := getattr(trace, "booking_id", None):
            bookings.add(str(v))
        if v := getattr(trace, "recommendation_id", None):
            recommendations.add(str(v))
        if v := getattr(trace, "report_id", None):
            reports.add(str(v))
        if v := getattr(trace, "payment_id", None):
            payments.add(str(v))
        if v := getattr(trace, "whatsapp_message_id", None):
            messages.add(str(v))
        if v := getattr(trace, "provider_reference", None):
            providers.add(str(v))
        if v := getattr(trace, "laboratory_id", None):
            providers.add(str(v))

"""Timeline scope resolution."""

from __future__ import annotations

from support_trace.identifiers.identifier_lookup_service import IdentifierLookupService
from support_trace.timeline.types import TimelineScope


class TimelineResolver:
    @classmethod
    def resolve_correlation(cls, correlation_id: str) -> TimelineScope:
        return TimelineScope(
            scope_type="correlation",
            scope_value=correlation_id,
            correlation_ids=(correlation_id,),
        )

    @classmethod
    def resolve_patient(cls, patient_account_id: str) -> TimelineScope:
        return TimelineScope(
            scope_type="patient",
            scope_value=patient_account_id,
            patient_account_id=patient_account_id,
        )

    @classmethod
    def resolve_consultation(cls, consultation_id: str) -> TimelineScope:
        return TimelineScope(
            scope_type="consultation",
            scope_value=consultation_id,
            consultation_id=consultation_id,
        )

    @classmethod
    def resolve_booking(cls, booking_id: str) -> TimelineScope:
        lookup = IdentifierLookupService.lookup_booking(booking_id)
        correlation_ids = tuple(
            {t.correlation_id for t in lookup.traces if t.correlation_id}
        )
        workflow_ids = tuple(
            {t.workflow_instance_id for t in lookup.traces + lookup.related_traces}
        )
        return TimelineScope(
            scope_type="booking",
            scope_value=booking_id,
            booking_id=booking_id,
            correlation_ids=correlation_ids,
            workflow_instance_ids=workflow_ids,
        )

    @classmethod
    def resolve_workflow(cls, workflow_instance_id: str) -> TimelineScope:
        return TimelineScope(
            scope_type="workflow",
            scope_value=workflow_instance_id,
            workflow_instance_ids=(workflow_instance_id,),
        )

    @classmethod
    def from_lookup_result(cls, lookup) -> TimelineScope:
        correlation_ids = tuple(
            {t.correlation_id for t in lookup.traces + lookup.related_traces if t.correlation_id}
        )
        workflow_ids = tuple(
            {t.workflow_instance_id for t in lookup.traces + lookup.related_traces}
        )
        primary = lookup.traces[0] if lookup.traces else None
        if primary and primary.correlation_id:
            return TimelineScope(
                scope_type="correlation",
                scope_value=primary.correlation_id,
                correlation_ids=correlation_ids,
                workflow_instance_ids=workflow_ids,
            )
        return TimelineScope(
            scope_type="workflow",
            scope_value=workflow_ids[0] if workflow_ids else "",
            workflow_instance_ids=workflow_ids,
        )

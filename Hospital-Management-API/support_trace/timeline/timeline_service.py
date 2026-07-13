"""Public timeline API for production support."""

from __future__ import annotations

from support_trace.timeline.hooks import fail_open_timeline
from support_trace.timeline.timeline_engine import TimelineEngine
from support_trace.timeline.timeline_resolver import TimelineResolver
from support_trace.timeline.types import TimelineFilter, TimelineResult


class TimelineService:
    """Read-only timeline aggregation — single authority for M5.5+."""

    @classmethod
    def build_correlation_timeline(
        cls,
        correlation_id: str,
        *,
        filters: TimelineFilter | None = None,
    ) -> TimelineResult:
        scope = TimelineResolver.resolve_correlation(correlation_id)
        return TimelineEngine.build(scope, filters=filters)

    @classmethod
    def build_patient_timeline(
        cls,
        patient_account_id: str,
        *,
        filters: TimelineFilter | None = None,
    ) -> TimelineResult:
        scope = TimelineResolver.resolve_patient(patient_account_id)
        return TimelineEngine.build(scope, filters=filters)

    @classmethod
    def build_consultation_timeline(
        cls,
        consultation_id: str,
        *,
        filters: TimelineFilter | None = None,
    ) -> TimelineResult:
        scope = TimelineResolver.resolve_consultation(consultation_id)
        return TimelineEngine.build(scope, filters=filters)

    @classmethod
    def build_booking_timeline(
        cls,
        booking_id: str,
        *,
        filters: TimelineFilter | None = None,
    ) -> TimelineResult:
        scope = TimelineResolver.resolve_booking(booking_id)
        return TimelineEngine.build(scope, filters=filters)

    @classmethod
    def build_workflow_timeline(
        cls,
        workflow_instance_id: str,
        *,
        filters: TimelineFilter | None = None,
    ) -> TimelineResult:
        scope = TimelineResolver.resolve_workflow(workflow_instance_id)
        return TimelineEngine.build(scope, filters=filters)

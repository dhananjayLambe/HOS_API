"""Failure analysis engine — pluggable."""

from __future__ import annotations

from typing import Any

from support_trace.incident.enums import FailureType
from support_trace.incident.investigation_context import IncidentContext
from support_trace.incident.types import FailureAnalysis
from support_trace.lookup.enums import ErrorClassification
from support_trace.lookup.types import TraceLookupResult
from support_trace.timeline.enums import TimelineSeverity


class FailureAnalysisEngine:
    @classmethod
    def analyze(cls, ctx: IncidentContext, lookup: TraceLookupResult) -> FailureAnalysis:
        primary = lookup.primary_trace
        timeline = lookup.timeline
        error_class = lookup.error_classification or ErrorClassification.UNKNOWN

        if not primary and not timeline:
            return FailureAnalysis(error_classification=error_class)

        failure_event = cls._find_failure_event(lookup)
        if failure_event:
            return cls._from_event(failure_event, lookup, error_class)

        if primary:
            status = str(getattr(primary, "status", "") or "").lower()
            if status in ("failed", "expired"):
                wf_type = str(getattr(primary, "workflow_type", "") or "Unknown")
                return FailureAnalysis(
                    failure_stage=wf_type,
                    failure_workflow=str(getattr(primary, "workflow_instance_id", "") or ""),
                    failure_component=wf_type,
                    failure_type=cls._map_error_class(error_class),
                    failure_reason=getattr(primary, "last_event", None) or f"{wf_type} failed",
                    error_classification=error_class,
                    failure_time=getattr(primary, "completed_at", None) or getattr(primary, "last_event_at", None),
                )

        return FailureAnalysis(error_classification=error_class)

    @classmethod
    def _find_failure_event(cls, lookup: TraceLookupResult) -> Any | None:
        if not lookup.timeline:
            return None
        for event in reversed(lookup.timeline.events):
            if event.severity in (TimelineSeverity.ERROR, TimelineSeverity.CRITICAL):
                return event
            status = str(event.status or "").lower()
            if "fail" in status:
                return event
        return None

    @classmethod
    def _from_event(cls, event: Any, lookup: TraceLookupResult, error_class: str) -> FailureAnalysis:
        wf_type = str(event.workflow_type or getattr(lookup.primary_trace, "workflow_type", "") or "Unknown")
        tags = event.tags or ()
        action = str(event.action or "")
        failure_type = FailureType.UNKNOWN
        if error_class == ErrorClassification.PROVIDER:
            failure_type = FailureType.PROVIDER
        elif error_class == ErrorClassification.INFRASTRUCTURE:
            failure_type = FailureType.INFRASTRUCTURE
        elif "timeout" in action.lower() or "timeout" in str(event.summary or "").lower():
            failure_type = FailureType.TIMEOUT
        elif "validation" in action.lower():
            failure_type = FailureType.VALIDATION
        elif error_class == ErrorClassification.TECHNICAL:
            failure_type = FailureType.APPLICATION
        if "routing" in tags or wf_type == "Routing":
            failure_type = FailureType.INFRASTRUCTURE if failure_type == FailureType.UNKNOWN else failure_type

        return FailureAnalysis(
            failure_stage=wf_type,
            failure_time=event.timestamp,
            failure_workflow=str(event.workflow_instance_id or ""),
            failure_component=str(event.category or wf_type),
            failure_type=failure_type,
            failure_reason=str(event.summary or event.action or "Unknown failure"),
            error_classification=error_class,
        )

    @staticmethod
    def _map_error_class(error_class: str) -> str:
        mapping = {
            ErrorClassification.PROVIDER: FailureType.PROVIDER,
            ErrorClassification.INFRASTRUCTURE: FailureType.INFRASTRUCTURE,
            ErrorClassification.TECHNICAL: FailureType.APPLICATION,
            ErrorClassification.BUSINESS: FailureType.VALIDATION,
        }
        return mapping.get(error_class, FailureType.UNKNOWN)

"""Investigation domain types — pure DTOs."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from support_trace.identifiers.types import IdentifierLookupResult
from support_trace.lookup.enums import ErrorClassification, InvestigationHealth, InvestigationLevel
from support_trace.lookup.investigation_policy import InvestigationOptions, InvestigationPolicy
from support_trace.timeline.types import (
    TimelineFetchBundle,
    TimelineFilter,
    TimelineGraph,
    TimelineResult,
    TimelineScope,
    WorkflowSnapshot,
)


@dataclass
class InvestigationContext:
    lookup_result: IdentifierLookupResult | None = None
    timeline_scope: TimelineScope | None = None
    primary_trace: Any | None = None
    bundle: TimelineFetchBundle | None = None
    filters: TimelineFilter | None = None
    options: InvestigationOptions | None = None
    level: InvestigationLevel = InvestigationLevel.FULL
    policy: InvestigationPolicy = field(default_factory=InvestigationPolicy.default)
    generated_at: datetime | None = None
    investigation_depth: int = 0
    timeline_result: TimelineResult | None = None
    related_traces: list[Any] = field(default_factory=list)


@dataclass(frozen=True)
class InvestigationTimeline:
    result: TimelineResult

    @property
    def events(self):
        return self.result.events

    @property
    def statistics(self):
        return self.result.statistics

    @property
    def workflow_snapshots(self):
        return self.result.workflow_snapshots

    @property
    def workflow_tree(self) -> TimelineGraph:
        return self.result.workflow_tree


@dataclass(frozen=True)
class StructuredSummary:
    workflow_type: str
    current_status: str
    current_step: str | None
    next_expected_step: str | None
    started_at: datetime | None
    completed_at: datetime | None
    duration_display: str
    retry_count: int
    failure_count: int
    patient_label: str | None
    owner_label: str | None


@dataclass(frozen=True)
class NarrativeSummary:
    text: str


@dataclass(frozen=True)
class InvestigationSummary:
    structured: StructuredSummary
    narrative: NarrativeSummary


@dataclass(frozen=True)
class HealthAssessment:
    overall: str
    workflow: str
    communication: str
    infrastructure: str
    provider: str
    aggregate: str


@dataclass(frozen=True)
class InvestigationStatistics:
    clinical_events: int = 0
    business_events: int = 0
    timeline_events: int = 0
    relationships: int = 0
    failed_events: int = 0
    retries: int = 0
    duration_ms: int | None = None
    provider_calls: int = 0
    messages: int = 0
    payments: int = 0
    active_workflows: int = 0
    completed_workflows: int = 0


@dataclass(frozen=True)
class IdentifierCollection:
    by_field: dict[str, str]
    entries: tuple[tuple[str, str], ...]

    @classmethod
    def empty(cls) -> IdentifierCollection:
        return cls(by_field={}, entries=())

    @classmethod
    def merge_traces(cls, traces: list[Any]) -> IdentifierCollection:
        from support_trace.identifiers.lookup_keys import identifiers_from_trace

        merged: dict[str, str] = {}
        for trace in traces:
            for field, value in identifiers_from_trace(trace).items():
                if field not in merged:
                    merged[field] = value
        entries = tuple(sorted(merged.items()))
        return cls(by_field=merged, entries=entries)


@dataclass
class TraceLookupResult:
    identifier_lookup: IdentifierLookupResult | None = None
    primary_trace: Any | None = None
    primary_snapshot: WorkflowSnapshot | None = None
    timeline: InvestigationTimeline | None = None
    clinical_audits: tuple[Any, ...] = ()
    business_audits: tuple[Any, ...] = ()
    workflow_graph: TimelineGraph | None = None
    identifiers: IdentifierCollection = field(default_factory=IdentifierCollection.empty)
    health: HealthAssessment | None = None
    summary: InvestigationSummary | None = None
    statistics: InvestigationStatistics | None = None
    error_classification: str = ErrorClassification.UNKNOWN
    level: InvestigationLevel = InvestigationLevel.FULL
    generated_at: datetime | None = None
    duration_ms: float = 0.0
    scope: str = ""

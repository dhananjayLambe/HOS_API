"""Incident reconstruction domain types — pure DTOs."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Protocol

from support_trace.incident.enums import FailureType, ReconstructionLevel, WorkflowEdgeType, WorkflowNodeType
from support_trace.lookup.types import InvestigationStatistics, InvestigationTimeline


@dataclass(frozen=True)
class WorkflowNode:
    node_id: str
    node_type: str
    label: str
    resource_id: str | None = None
    workflow_type: str | None = None
    status: str | None = None
    depth: int = 0


@dataclass(frozen=True)
class WorkflowEdge:
    source_id: str
    target_id: str
    edge_type: str
    label: str | None = None


@dataclass(frozen=True)
class WorkflowGraph:
    nodes: tuple[WorkflowNode, ...]
    edges: tuple[WorkflowEdge, ...]

    def root(self) -> WorkflowNode | None:
        if not self.nodes:
            return None
        child_sources = {e.source_id for e in self.edges if e.edge_type == WorkflowEdgeType.CHILD}
        roots = [n for n in self.nodes if n.node_id not in child_sources]
        if roots:
            return min(roots, key=lambda n: n.depth)
        return self.nodes[0]

    def children(self, node_id: str) -> tuple[WorkflowNode, ...]:
        child_ids = {
            e.target_id
            for e in self.edges
            if e.source_id == node_id and e.edge_type == WorkflowEdgeType.CHILD
        }
        return tuple(n for n in self.nodes if n.node_id in child_ids)

    def find(self, node_id: str) -> WorkflowNode | None:
        for node in self.nodes:
            if node.node_id == node_id:
                return node
        return None


@dataclass(frozen=True)
class EntityRefs:
    patient: str | None = None
    consultation: str | None = None
    recommendation: str | None = None
    booking: str | None = None
    routing: str | None = None
    report: str | None = None
    delivery: str | None = None
    whatsapp: str | None = None
    payment: str | None = None


@dataclass(frozen=True)
class FailureAnalysis:
    failure_stage: str | None = None
    failure_time: datetime | None = None
    failure_workflow: str | None = None
    failure_component: str | None = None
    failure_type: str = FailureType.UNKNOWN
    failure_reason: str | None = None
    error_classification: str | None = None

    @property
    def has_failure(self) -> bool:
        return self.failure_stage is not None or self.failure_reason is not None


@dataclass(frozen=True)
class RetryEvent:
    workflow_type: str
    timestamp: datetime | None
    reason: str | None
    succeeded: bool
    sequence: int


@dataclass(frozen=True)
class RetryAnalysis:
    total_retries: int = 0
    events: tuple[RetryEvent, ...] = ()
    by_workflow: dict[str, int] = field(default_factory=dict)

    def retry_count_for(self, workflow_type: str) -> int:
        return self.by_workflow.get(workflow_type, 0)


@dataclass(frozen=True)
class StageDuration:
    stage: str
    duration_ms: int | None
    sla_ms: int | None = None
    sla_breached: bool = False


@dataclass(frozen=True)
class DurationAnalysis:
    stages: tuple[StageDuration, ...] = ()
    total_duration_ms: int | None = None
    total_display: str = "—"


@dataclass(frozen=True)
class ImpactAnalysis:
    affected_patients: tuple[str, ...] = ()
    affected_bookings: tuple[str, ...] = ()
    affected_recommendations: tuple[str, ...] = ()
    affected_reports: tuple[str, ...] = ()
    affected_payments: tuple[str, ...] = ()
    affected_messages: tuple[str, ...] = ()
    affected_providers: tuple[str, ...] = ()
    downstream_workflows: tuple[str, ...] = ()

    @property
    def affected_resource_count(self) -> int:
        return (
            len(self.affected_patients)
            + len(self.affected_bookings)
            + len(self.affected_recommendations)
            + len(self.affected_reports)
            + len(self.affected_payments)
            + len(self.affected_messages)
        )


@dataclass(frozen=True)
class IncidentSummary:
    status: str
    completed: bool
    has_failure: bool
    retry_count: int
    duration_display: str
    affected_resources: int
    failure_stage: str | None = None


@dataclass(frozen=True)
class IncidentRecommendation:
    action: str
    reason: str
    priority: str = "medium"


class AnalysisEngine(Protocol):
    @classmethod
    def analyze(cls, ctx: Any, lookup: Any) -> Any: ...


@dataclass(frozen=True)
class IncidentReport:
    investigation_id: str
    primary_workflow: str | None
    entities: EntityRefs
    timeline: InvestigationTimeline | None
    workflow_graph: WorkflowGraph
    related_workflows: tuple[str, ...]
    related_resources: tuple[str, ...]
    failure: FailureAnalysis | None
    retry: RetryAnalysis | None
    duration: DurationAnalysis | None
    impact: ImpactAnalysis | None
    summary: IncidentSummary | None
    narrative: str | None
    recommendations: tuple[IncidentRecommendation, ...]
    statistics: InvestigationStatistics | None
    generated_at: datetime
    duration_ms: float
    scope: str
    level: str
    partial: bool = False

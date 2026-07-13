"""Timeline domain types — pure DTOs, no ORM."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from support_trace.timeline.enums import (
    SnapshotWorkflowHealth,
    TimelineCategory,
    TimelineSeverity,
    TimelineSource,
)


@dataclass(frozen=True)
class TimelineEvent:
    timeline_event_id: str
    timestamp: datetime
    timeline_sequence: int
    event: str
    category: str
    severity: str
    tags: tuple[str, ...]
    source: str
    workflow_type: str | None
    workflow_instance_id: str | None
    parent_workflow_instance_id: str | None
    correlation_id: str | None
    patient_account_id: str | None
    consultation_id: str | None
    resource_type: str | None
    resource_id: str | None
    actor: str | None
    status: str | None
    state_before: str | None
    state_after: str | None
    summary: str
    reference_id: str
    reference_type: str
    sequence_no: int | None
    action: str | None
    display_icon: str | None = None
    display_color: str | None = None


@dataclass(frozen=True)
class WorkflowSnapshot:
    workflow_instance_id: str
    workflow_type: str
    current_state: str
    workflow_step: str | None
    status: str
    workflow_health: str
    duration_ms: int | None
    retry_count: int
    correlation_id: str | None


@dataclass(frozen=True)
class TimelineStatistics:
    clinical_events: int = 0
    business_events: int = 0
    total_events: int = 0
    workflow_count: int = 0
    communication_count: int = 0
    failed_events: int = 0
    retry_events: int = 0
    critical_events: int = 0
    completed_workflows: int = 0
    active_workflows: int = 0
    first_event_at: datetime | None = None
    last_event_at: datetime | None = None
    timeline_duration_ms: int | None = None
    retry_count_total: int = 0


@dataclass(frozen=True)
class TimelineGraphNode:
    workflow_instance_id: str
    workflow_type: str
    label: str
    depth: int
    status: str | None


@dataclass(frozen=True)
class TimelineGraphEdge:
    parent_workflow_instance_id: str
    child_workflow_instance_id: str
    edge_type: str


@dataclass(frozen=True)
class TimelineGraph:
    nodes: tuple[TimelineGraphNode, ...]
    edges: tuple[TimelineGraphEdge, ...]

    def as_tree(self) -> list[dict[str, Any]]:
        node_map = {n.workflow_instance_id: n for n in self.nodes}
        children: dict[str, list[str]] = {n.workflow_instance_id: [] for n in self.nodes}
        roots: list[str] = []
        for edge in self.edges:
            if edge.edge_type == "parent_child":
                children.setdefault(edge.parent_workflow_instance_id, []).append(
                    edge.child_workflow_instance_id
                )
        child_ids = {e.child_workflow_instance_id for e in self.edges if e.edge_type == "parent_child"}
        for node in self.nodes:
            if node.workflow_instance_id not in child_ids:
                roots.append(node.workflow_instance_id)

        def build(wf_id: str) -> dict[str, Any]:
            node = node_map[wf_id]
            return {
                "workflow_instance_id": wf_id,
                "workflow_type": node.workflow_type,
                "label": node.label,
                "status": node.status,
                "children": [build(cid) for cid in children.get(wf_id, [])],
            }

        return [build(r) for r in roots]

    def root(self) -> TimelineGraphNode | None:
        child_ids = {
            e.child_workflow_instance_id
            for e in self.edges
            if e.edge_type == "parent_child"
        }
        roots = [n for n in self.nodes if n.workflow_instance_id not in child_ids]
        if not roots:
            return self.nodes[0] if self.nodes else None
        return min(roots, key=lambda n: n.depth)

    def find(self, workflow_instance_id: str) -> TimelineGraphNode | None:
        for node in self.nodes:
            if node.workflow_instance_id == workflow_instance_id:
                return node
        return None

    def children(self, workflow_instance_id: str) -> tuple[TimelineGraphNode, ...]:
        child_ids = [
            e.child_workflow_instance_id
            for e in self.edges
            if e.edge_type == "parent_child"
            and e.parent_workflow_instance_id == workflow_instance_id
        ]
        return tuple(n for n in self.nodes if n.workflow_instance_id in child_ids)

    def parents(self, workflow_instance_id: str) -> tuple[TimelineGraphNode, ...]:
        parent_ids = [
            e.parent_workflow_instance_id
            for e in self.edges
            if e.edge_type == "parent_child"
            and e.child_workflow_instance_id == workflow_instance_id
        ]
        return tuple(n for n in self.nodes if n.workflow_instance_id in parent_ids)

    def depth(self, workflow_instance_id: str) -> int:
        node = self.find(workflow_instance_id)
        return node.depth if node else 0

    def to_tree(self) -> list[dict[str, Any]]:
        return self.as_tree()


@dataclass(frozen=True)
class TimelineScope:
    scope_type: str
    scope_value: str
    correlation_ids: tuple[str, ...] = ()
    workflow_instance_ids: tuple[str, ...] = ()
    patient_account_id: str | None = None
    consultation_id: str | None = None
    booking_id: str | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None


@dataclass(frozen=True)
class TimelineFetchBundle:
    clinical_rows: tuple[Any, ...]
    business_rows: tuple[Any, ...]
    support_traces: tuple[Any, ...]
    scope: TimelineScope


@dataclass
class TimelineFilter:
    date_from: datetime | None = None
    date_to: datetime | None = None
    categories: tuple[str, ...] = ()
    severities: tuple[str, ...] = ()
    tags: tuple[str, ...] = ()
    workflow_types: tuple[str, ...] = ()
    actors: tuple[str, ...] = ()
    statuses: tuple[str, ...] = ()
    sources: tuple[str, ...] = ()
    action_prefix: str | None = None


@dataclass
class TimelineResult:
    events: list[TimelineEvent] = field(default_factory=list)
    workflow_snapshots: list[WorkflowSnapshot] = field(default_factory=list)
    workflow_tree: TimelineGraph = field(
        default_factory=lambda: TimelineGraph(nodes=(), edges=())
    )
    statistics: TimelineStatistics = field(default_factory=TimelineStatistics)
    generated_at: datetime | None = None
    build_duration_ms: float = 0.0
    scope: str = ""

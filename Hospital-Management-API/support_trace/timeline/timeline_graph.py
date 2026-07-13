"""Workflow hierarchy graph for timeline results."""

from __future__ import annotations

from typing import Any

from support_trace.timeline.types import (
    TimelineEvent,
    TimelineGraph,
    TimelineGraphEdge,
    TimelineGraphNode,
)


class TimelineGraphBuilder:
    @classmethod
    def build(
        cls,
        traces: list[Any],
        events: list[TimelineEvent],
    ) -> TimelineGraph:
        nodes: dict[str, TimelineGraphNode] = {}
        edges: list[TimelineGraphEdge] = []
        seen_edges: set[tuple[str, str, str]] = set()

        for trace in traces:
            wf_id = str(getattr(trace, "workflow_instance_id", ""))
            if not wf_id:
                continue
            nodes[wf_id] = TimelineGraphNode(
                workflow_instance_id=wf_id,
                workflow_type=str(getattr(trace, "workflow_type", "") or ""),
                label=str(getattr(trace, "workflow_type", "") or wf_id),
                depth=int(getattr(trace, "workflow_depth", 0) or 0),
                status=str(getattr(trace, "status", "") or "") or None,
            )
            parent = getattr(trace, "parent_workflow_instance_id", None)
            if parent:
                key = (str(parent), wf_id, "parent_child")
                if key not in seen_edges:
                    seen_edges.add(key)
                    edges.append(
                        TimelineGraphEdge(
                            parent_workflow_instance_id=str(parent),
                            child_workflow_instance_id=wf_id,
                            edge_type="parent_child",
                        )
                    )

        for event in events:
            wf_id = event.workflow_instance_id
            if wf_id and wf_id not in nodes:
                nodes[wf_id] = TimelineGraphNode(
                    workflow_instance_id=wf_id,
                    workflow_type=event.workflow_type or "",
                    label=event.workflow_type or wf_id,
                    depth=0,
                    status=event.status,
                )
            parent = event.parent_workflow_instance_id
            if wf_id and parent:
                key = (str(parent), wf_id, "parent_child")
                if key not in seen_edges:
                    seen_edges.add(key)
                    edges.append(
                        TimelineGraphEdge(
                            parent_workflow_instance_id=str(parent),
                            child_workflow_instance_id=wf_id,
                            edge_type="parent_child",
                        )
                    )

        corr_groups: dict[str, list[str]] = {}
        for trace in traces:
            corr = getattr(trace, "correlation_id", None)
            wf_id = getattr(trace, "workflow_instance_id", None)
            if corr and wf_id:
                corr_groups.setdefault(str(corr), []).append(str(wf_id))

        for corr, wf_ids in corr_groups.items():
            for i in range(len(wf_ids) - 1):
                key = (wf_ids[i], wf_ids[i + 1], "correlation")
                if key not in seen_edges:
                    seen_edges.add(key)
                    edges.append(
                        TimelineGraphEdge(
                            parent_workflow_instance_id=wf_ids[i],
                            child_workflow_instance_id=wf_ids[i + 1],
                            edge_type="correlation",
                        )
                    )

        return TimelineGraph(
            nodes=tuple(nodes.values()),
            edges=tuple(edges),
        )

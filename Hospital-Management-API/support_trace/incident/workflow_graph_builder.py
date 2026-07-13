"""Build typed incident workflow graph from lookup result."""

from __future__ import annotations

from typing import Any

from support_trace.incident.constants import JOURNEY_ENTITY_FIELDS
from support_trace.incident.enums import WorkflowEdgeType, WorkflowNodeType
from support_trace.incident.relationship_engine import RelationshipEngine
from support_trace.incident.types import EntityRefs, WorkflowEdge, WorkflowGraph, WorkflowNode
from support_trace.lookup.types import TraceLookupResult
from support_trace.timeline.types import TimelineGraph


class WorkflowGraphBuilder:
    @classmethod
    def build(cls, lookup: TraceLookupResult) -> WorkflowGraph:
        nodes: list[WorkflowNode] = []
        edges: list[WorkflowEdge] = []
        seen: set[str] = set()

        entities = cls.extract_entities(lookup)
        cls._add_entity_nodes(entities, nodes, seen)

        traces = RelationshipEngine.ordered_chain_traces(RelationshipEngine.expand_journey(lookup))
        prev_node_id: str | None = None
        for trace in traces:
            wf_id = str(getattr(trace, "workflow_instance_id", "") or "")
            if not wf_id or wf_id in seen:
                continue
            seen.add(wf_id)
            wf_type = str(getattr(trace, "workflow_type", "") or "Workflow")
            node = WorkflowNode(
                node_id=wf_id,
                node_type=WorkflowNodeType.WORKFLOW,
                label=wf_type,
                resource_id=wf_id,
                workflow_type=wf_type,
                status=str(getattr(trace, "status", "") or ""),
                depth=int(getattr(trace, "workflow_depth", 0) or 0),
            )
            nodes.append(node)
            if prev_node_id:
                edges.append(
                    WorkflowEdge(
                        source_id=prev_node_id,
                        target_id=wf_id,
                        edge_type=WorkflowEdgeType.CHILD,
                        label="triggered",
                    )
                )
            prev_node_id = wf_id

        if lookup.workflow_graph:
            cls._merge_timeline_graph(lookup.workflow_graph, nodes, edges, seen)

        cls._add_retry_edges(lookup, edges)
        cls._add_communication_edges(lookup, edges)

        return WorkflowGraph(nodes=tuple(nodes), edges=tuple(edges))

    @classmethod
    def extract_entities(cls, lookup: TraceLookupResult) -> EntityRefs:
        by_field = lookup.identifiers.by_field if lookup.identifiers else {}
        trace = lookup.primary_trace

        def get(field: str) -> str | None:
            if field in by_field:
                return by_field[field]
            if trace:
                val = getattr(trace, field, None)
                return str(val) if val else None
            return None

        return EntityRefs(
            patient=get("patient_account_id"),
            consultation=get("consultation_id"),
            recommendation=get("recommendation_id"),
            booking=get("booking_id"),
            routing=get("routing_id"),
            report=get("report_id"),
            delivery=get("order_id"),
            whatsapp=get("whatsapp_message_id"),
            payment=get("payment_id"),
        )

    @classmethod
    def _add_entity_nodes(
        cls,
        entities: EntityRefs,
        nodes: list[WorkflowNode],
        seen: set[str],
    ) -> None:
        type_map = {
            "patient": (WorkflowNodeType.PATIENT, entities.patient),
            "consultation": (WorkflowNodeType.WORKFLOW, entities.consultation),
            "recommendation": (WorkflowNodeType.WORKFLOW, entities.recommendation),
            "booking": (WorkflowNodeType.WORKFLOW, entities.booking),
            "routing": (WorkflowNodeType.WORKFLOW, entities.routing),
            "report": (WorkflowNodeType.WORKFLOW, entities.report),
            "whatsapp": (WorkflowNodeType.MESSAGE, entities.whatsapp),
            "payment": (WorkflowNodeType.PAYMENT, entities.payment),
        }
        for name, (node_type, resource_id) in type_map.items():
            if not resource_id or resource_id in seen:
                continue
            seen.add(resource_id)
            nodes.append(
                WorkflowNode(
                    node_id=resource_id,
                    node_type=node_type,
                    label=name.capitalize(),
                    resource_id=resource_id,
                    depth=len(nodes),
                )
            )

    @classmethod
    def _merge_timeline_graph(
        cls,
        timeline_graph: TimelineGraph,
        nodes: list[WorkflowNode],
        edges: list[WorkflowEdge],
        seen: set[str],
    ) -> None:
        for tg_node in timeline_graph.nodes:
            if tg_node.workflow_instance_id in seen:
                continue
            seen.add(tg_node.workflow_instance_id)
            nodes.append(
                WorkflowNode(
                    node_id=tg_node.workflow_instance_id,
                    node_type=WorkflowNodeType.WORKFLOW,
                    label=tg_node.label or tg_node.workflow_type,
                    resource_id=tg_node.workflow_instance_id,
                    workflow_type=tg_node.workflow_type,
                    status=tg_node.status,
                    depth=tg_node.depth,
                )
            )
        for tg_edge in timeline_graph.edges:
            if tg_edge.edge_type == "parent_child":
                edges.append(
                    WorkflowEdge(
                        source_id=tg_edge.parent_workflow_instance_id,
                        target_id=tg_edge.child_workflow_instance_id,
                        edge_type=WorkflowEdgeType.PARENT,
                    )
                )

    @classmethod
    def _add_retry_edges(cls, lookup: TraceLookupResult, edges: list[WorkflowEdge]) -> None:
        if not lookup.timeline:
            return
        for event in lookup.timeline.events:
            tags = event.tags or ()
            if "retry" not in tags:
                continue
            wf_id = str(event.workflow_instance_id or "")
            if wf_id:
                edges.append(
                    WorkflowEdge(
                        source_id=wf_id,
                        target_id=wf_id,
                        edge_type=WorkflowEdgeType.RETRY,
                        label=str(event.summary or "retry"),
                    )
                )

    @classmethod
    def _add_communication_edges(cls, lookup: TraceLookupResult, edges: list[WorkflowEdge]) -> None:
        if not lookup.timeline:
            return
        for event in lookup.timeline.events:
            cat = str(event.category or "").lower()
            if "whatsapp" not in cat and "communication" not in cat and "message" not in cat:
                continue
            wf_id = str(event.workflow_instance_id or "")
            msg_id = str(getattr(event, "reference_id", "") or event.resource_id or "")
            if wf_id and msg_id:
                edges.append(
                    WorkflowEdge(
                        source_id=wf_id,
                        target_id=msg_id,
                        edge_type=WorkflowEdgeType.COMMUNICATION,
                        label="message",
                    )
                )

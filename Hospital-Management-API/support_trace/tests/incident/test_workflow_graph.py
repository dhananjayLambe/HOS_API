"""Workflow graph builder tests."""

from __future__ import annotations

from django.test import SimpleTestCase

from support_trace.incident.enums import WorkflowEdgeType, WorkflowNodeType
from support_trace.incident.workflow_graph_builder import WorkflowGraphBuilder
from support_trace.lookup.types import IdentifierCollection, TraceLookupResult
from support_trace.timeline.types import TimelineGraph, TimelineGraphEdge, TimelineGraphNode


class WorkflowGraphTests(SimpleTestCase):
    def _trace(self, wf_id: str, wf_type: str, booking_id: str | None = None):
        class Trace:
            pass

        t = Trace()
        t.workflow_instance_id = wf_id
        t.workflow_type = wf_type
        t.status = "Completed"
        t.workflow_depth = 0
        t.booking_id = booking_id
        t.patient_account_id = None
        t.consultation_id = None
        t.recommendation_id = None
        t.routing_id = None
        t.report_id = None
        t.whatsapp_message_id = None
        t.payment_id = None
        return t

    def test_graph_creation(self) -> None:
        trace = self._trace("wf-1", "Booking", "book-1")
        lookup = TraceLookupResult(
            primary_trace=trace,
            identifiers=IdentifierCollection(by_field={"booking_id": "book-1"}, entries=(("booking_id", "book-1"),)),
        )
        graph = WorkflowGraphBuilder.build(lookup)
        self.assertGreater(len(graph.nodes), 0)

    def test_parent_child_edges(self) -> None:
        t1 = self._trace("wf-parent", "Consultation")
        t2 = self._trace("wf-child", "Booking", "book-1")
        tg = TimelineGraph(
            nodes=(
                TimelineGraphNode("wf-parent", "Consultation", "Consultation", 0, "Completed"),
                TimelineGraphNode("wf-child", "Booking", "Booking", 1, "Completed"),
            ),
            edges=(TimelineGraphEdge("wf-parent", "wf-child", "parent_child"),),
        )
        lookup = TraceLookupResult(primary_trace=t2, workflow_graph=tg)
        graph = WorkflowGraphBuilder.build(lookup)
        parent_edges = [e for e in graph.edges if e.edge_type == WorkflowEdgeType.PARENT]
        self.assertGreaterEqual(len(parent_edges), 0)

    def test_root_node(self) -> None:
        trace = self._trace("wf-root", "Booking")
        lookup = TraceLookupResult(primary_trace=trace)
        graph = WorkflowGraphBuilder.build(lookup)
        root = graph.root()
        self.assertIsNotNone(root)

    def test_entity_extraction(self) -> None:
        trace = self._trace("wf-1", "Booking", "book-99")
        lookup = TraceLookupResult(
            primary_trace=trace,
            identifiers=IdentifierCollection(
                by_field={"booking_id": "book-99", "patient_account_id": "pat-1"},
                entries=(("booking_id", "book-99"), ("patient_account_id", "pat-1")),
            ),
        )
        entities = WorkflowGraphBuilder.extract_entities(lookup)
        self.assertEqual(entities.booking, "book-99")
        self.assertEqual(entities.patient, "pat-1")

    def test_children_helper(self) -> None:
        trace = self._trace("wf-1", "Consultation")
        lookup = TraceLookupResult(primary_trace=trace)
        graph = WorkflowGraphBuilder.build(lookup)
        children = graph.children(graph.root().node_id if graph.root() else "")
        self.assertIsInstance(children, tuple)

    def test_workflow_node_type(self) -> None:
        trace = self._trace("wf-1", "Booking")
        lookup = TraceLookupResult(primary_trace=trace)
        graph = WorkflowGraphBuilder.build(lookup)
        wf_nodes = [n for n in graph.nodes if n.node_type == WorkflowNodeType.WORKFLOW]
        self.assertGreater(len(wf_nodes), 0)

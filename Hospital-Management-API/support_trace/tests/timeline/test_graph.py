"""Timeline graph tests."""

from __future__ import annotations

import uuid
from types import SimpleNamespace

from django.test import TestCase

from support_trace.timeline.timeline_graph import TimelineGraphBuilder


class GraphTests(TestCase):
    def test_build_tree_from_parent_child(self) -> None:
        parent_id = str(uuid.uuid4())
        child_id = str(uuid.uuid4())
        traces = [
            SimpleNamespace(
                workflow_instance_id=parent_id,
                workflow_type="Recommendation",
                workflow_depth=0,
                status="Completed",
                parent_workflow_instance_id=None,
                correlation_id=str(uuid.uuid4()),
            ),
            SimpleNamespace(
                workflow_instance_id=child_id,
                workflow_type="Booking",
                workflow_depth=1,
                status="Running",
                parent_workflow_instance_id=parent_id,
                correlation_id=str(uuid.uuid4()),
            ),
        ]
        graph = TimelineGraphBuilder.build(traces, [])
        self.assertEqual(len(graph.nodes), 2)
        tree = graph.as_tree()
        self.assertEqual(len(tree), 1)
        self.assertEqual(tree[0]["workflow_instance_id"], parent_id)
        self.assertEqual(len(tree[0]["children"]), 1)

"""TimelineGraph helper method tests."""

from django.test import SimpleTestCase

from support_trace.timeline.types import TimelineGraph, TimelineGraphEdge, TimelineGraphNode


class TimelineGraphHelperTests(SimpleTestCase):
    def setUp(self) -> None:
        self.graph = TimelineGraph(
            nodes=(
                TimelineGraphNode("root", "Recommendation", "Recommendation", 0, "Completed"),
                TimelineGraphNode("child", "Booking", "Booking", 1, "Running"),
            ),
            edges=(
                TimelineGraphEdge("root", "child", "parent_child"),
            ),
        )

    def test_root(self) -> None:
        root = self.graph.root()
        self.assertIsNotNone(root)
        self.assertEqual(root.workflow_instance_id, "root")

    def test_children_and_parents(self) -> None:
        children = self.graph.children("root")
        self.assertEqual(len(children), 1)
        parents = self.graph.parents("child")
        self.assertEqual(len(parents), 1)

    def test_find_and_depth(self) -> None:
        node = self.graph.find("child")
        self.assertIsNotNone(node)
        self.assertEqual(self.graph.depth("child"), 1)

    def test_to_tree(self) -> None:
        tree = self.graph.to_tree()
        self.assertEqual(len(tree), 1)
        self.assertEqual(tree[0]["workflow_instance_id"], "root")

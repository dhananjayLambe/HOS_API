"""Incident certification tests."""

from __future__ import annotations

from django.test import SimpleTestCase
from datetime import datetime, timezone

from support_trace.incident.certification import IncidentCertification
from support_trace.incident.types import (
    EntityRefs,
    FailureAnalysis,
    IncidentReport,
    IncidentSummary,
    WorkflowEdge,
    WorkflowGraph,
    WorkflowNode,
)
from support_trace.incident.enums import WorkflowEdgeType, WorkflowNodeType


class CertificationTests(SimpleTestCase):
    def _report(self, **kwargs) -> IncidentReport:
        defaults = dict(
            investigation_id="inv-1",
            primary_workflow="wf-1",
            entities=EntityRefs(),
            timeline=None,
            workflow_graph=WorkflowGraph(nodes=(), edges=()),
            related_workflows=(),
            related_resources=(),
            failure=None,
            retry=None,
            duration=None,
            impact=None,
            summary=None,
            narrative=None,
            recommendations=(),
            statistics=None,
            generated_at=datetime.now(timezone.utc),
            duration_ms=1.0,
            scope="test",
            level="Full",
        )
        defaults.update(kwargs)
        return IncidentReport(**defaults)

    def test_graph_integrity_valid(self) -> None:
        graph = WorkflowGraph(
            nodes=(WorkflowNode("n1", WorkflowNodeType.WORKFLOW, "Booking", depth=0),),
            edges=(),
        )
        report = self._report(workflow_graph=graph)
        warnings = IncidentCertification.validate_graph_integrity(report)
        self.assertEqual(warnings, [])

    def test_graph_orphan_edge(self) -> None:
        graph = WorkflowGraph(
            nodes=(WorkflowNode("n1", WorkflowNodeType.WORKFLOW, "Booking"),),
            edges=(WorkflowEdge("n1", "missing", WorkflowEdgeType.CHILD),),
        )
        report = self._report(workflow_graph=graph)
        warnings = IncidentCertification.validate_graph_integrity(report)
        self.assertGreater(len(warnings), 0)

    def test_failure_consistency(self) -> None:
        report = self._report(
            failure=FailureAnalysis(failure_stage="Routing", failure_reason="timeout"),
            summary=IncidentSummary(
                status="Completed",
                completed=True,
                has_failure=False,
                retry_count=0,
                duration_display="—",
                affected_resources=0,
            ),
        )
        warnings = IncidentCertification.validate_failure_consistency(report)
        self.assertGreater(len(warnings), 0)

    def test_deterministic_hash_stable(self) -> None:
        report1 = self._report(scope="booking:abc", primary_workflow="wf-1")
        report2 = self._report(scope="booking:abc", primary_workflow="wf-1")
        self.assertEqual(
            IncidentCertification.deterministic_hash(report1),
            IncidentCertification.deterministic_hash(report2),
        )

    def test_narrative_consistency_warning(self) -> None:
        report = self._report(
            narrative="All stages completed successfully.",
            failure=FailureAnalysis(failure_stage="Routing", failure_reason="timeout"),
            summary=IncidentSummary(
                status="Failed",
                completed=False,
                has_failure=True,
                retry_count=0,
                duration_display="—",
                affected_resources=0,
            ),
        )
        warnings = IncidentCertification.validate_narrative_consistency(report)
        self.assertGreater(len(warnings), 0)

    def test_validate_full_report(self) -> None:
        graph = WorkflowGraph(
            nodes=(WorkflowNode("wf-1", WorkflowNodeType.WORKFLOW, "Booking", depth=0),),
            edges=(),
        )
        report = self._report(workflow_graph=graph)
        warnings = IncidentCertification.validate(report)
        self.assertIsInstance(warnings, list)

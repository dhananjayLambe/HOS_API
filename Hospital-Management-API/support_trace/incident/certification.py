"""Incident reconstruction certification validators."""

from __future__ import annotations

import hashlib
import json
import logging

from support_trace.incident.types import IncidentReport

logger = logging.getLogger(__name__)


class IncidentCertification:
    @classmethod
    def validate(cls, report: IncidentReport) -> list[str]:
        warnings: list[str] = []
        warnings.extend(cls.validate_graph_integrity(report))
        warnings.extend(cls.validate_failure_consistency(report))
        warnings.extend(cls.validate_narrative_consistency(report))
        warnings.extend(cls.validate_duration_consistency(report))
        for warning in warnings:
            logger.warning("incident_certification_warning", extra={"warning": warning})
        return warnings

    @classmethod
    def validate_graph_integrity(cls, report: IncidentReport) -> list[str]:
        graph = report.workflow_graph
        if not graph.nodes:
            return []
        root = graph.root()
        if root is None:
            return ["workflow graph has no root node"]
        node_ids = {n.node_id for n in graph.nodes}
        for edge in graph.edges:
            if edge.source_id not in node_ids or edge.target_id not in node_ids:
                return [f"orphan edge: {edge.source_id} -> {edge.target_id}"]
        return []

    @classmethod
    def validate_failure_consistency(cls, report: IncidentReport) -> list[str]:
        if not report.failure or not report.failure.has_failure:
            return []
        if report.summary and not report.summary.has_failure:
            return ["failure analysis set but summary reports no failure"]
        return []

    @classmethod
    def validate_narrative_consistency(cls, report: IncidentReport) -> list[str]:
        if not report.narrative or not report.failure or not report.failure.has_failure:
            return []
        if "fail" not in report.narrative.lower() and report.summary and report.summary.has_failure:
            return ["narrative does not mention failure despite failed incident"]
        return []

    @classmethod
    def validate_duration_consistency(cls, report: IncidentReport) -> list[str]:
        if not report.duration or not report.duration.stages:
            return []
        stage_sum = sum(s.duration_ms or 0 for s in report.duration.stages)
        total = report.duration.total_duration_ms
        if total and stage_sum > 0 and stage_sum > total * 2:
            return [f"stage durations ({stage_sum}ms) exceed total ({total}ms) by large margin"]
        return []

    @classmethod
    def deterministic_hash(cls, report: IncidentReport) -> str:
        """Hash excluding timestamps and investigation_id for determinism checks."""
        payload = {
            "scope": report.scope,
            "level": report.level,
            "primary_workflow": report.primary_workflow,
            "summary_status": report.summary.status if report.summary else None,
            "failure_stage": report.failure.failure_stage if report.failure else None,
            "retry_total": report.retry.total_retries if report.retry else 0,
            "graph_nodes": len(report.workflow_graph.nodes),
        }
        return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()

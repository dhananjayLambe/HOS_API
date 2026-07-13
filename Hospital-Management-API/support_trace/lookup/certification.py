"""M5.9-ready investigation certification validators."""

from __future__ import annotations

import logging

from support_trace.lookup.investigation_policy import InvestigationPolicy
from support_trace.lookup.types import TraceLookupResult

logger = logging.getLogger(__name__)


class InvestigationCertification:
    @classmethod
    def validate(
        cls,
        result: TraceLookupResult,
        *,
        policy: InvestigationPolicy | None = None,
    ) -> list[str]:
        warnings: list[str] = []
        warnings.extend(cls.validate_primary_trace(result))
        warnings.extend(cls.validate_identifier_resolution(result))
        warnings.extend(cls.validate_timeline_order(result))
        warnings.extend(cls.validate_timeline_populated(result))
        warnings.extend(cls.validate_relationship_depth(result, policy))
        warnings.extend(cls.validate_graph_coherence(result))
        warnings.extend(cls.validate_summary(result))
        warnings.extend(cls.validate_health(result))
        warnings.extend(cls.validate_identifier_collection(result))
        for warning in warnings:
            logger.warning("investigation_certification_warning", extra={"warning": warning})
        return warnings

    @classmethod
    def validate_primary_trace(cls, result: TraceLookupResult) -> list[str]:
        lookup = result.identifier_lookup
        if lookup and lookup.traces and result.primary_trace is None:
            return ["primary_trace missing despite identifier matches"]
        return []

    @classmethod
    def validate_identifier_resolution(cls, result: TraceLookupResult) -> list[str]:
        lookup = result.identifier_lookup
        if lookup and lookup.traces and lookup.confidence <= 0:
            return ["identifier resolution confidence is zero with matches"]
        return []

    @classmethod
    def validate_timeline_order(cls, result: TraceLookupResult) -> list[str]:
        if not result.timeline or not result.timeline.events:
            return []
        seqs = [e.timeline_sequence for e in result.timeline.events]
        if seqs != sorted(seqs):
            return ["timeline events not in sequence order"]
        return []

    @classmethod
    def validate_timeline_populated(cls, result: TraceLookupResult) -> list[str]:
        if result.timeline is None:
            return []
        if result.identifier_lookup and result.identifier_lookup.traces:
            if not result.timeline.events and result.clinical_audits or result.business_audits:
                return ["timeline empty but audits present"]
        return []

    @classmethod
    def validate_relationship_depth(
        cls,
        result: TraceLookupResult,
        policy: InvestigationPolicy | None,
    ) -> list[str]:
        if not result.workflow_graph or not policy:
            return []
        max_depth = max((n.depth for n in result.workflow_graph.nodes), default=0)
        if max_depth > policy.max_graph_depth:
            return [f"graph depth {max_depth} exceeds policy limit {policy.max_graph_depth}"]
        return []

    @classmethod
    def validate_graph_coherence(cls, result: TraceLookupResult) -> list[str]:
        if not result.workflow_graph or not result.identifier_lookup:
            return []
        graph_wfs = {n.workflow_instance_id for n in result.workflow_graph.nodes}
        trace_wfs = {
            str(getattr(t, "workflow_instance_id", ""))
            for t in result.identifier_lookup.traces
        }
        orphan = trace_wfs - graph_wfs
        if orphan and result.workflow_graph.nodes:
            return [f"traces not in graph: {orphan}"]
        return []

    @classmethod
    def validate_summary(cls, result: TraceLookupResult) -> list[str]:
        if not result.summary or not result.primary_trace:
            return []
        status = result.summary.structured.current_status
        narrative = result.summary.narrative.text.lower()
        if status.lower() == "failed" and "fail" not in narrative and "attention" not in narrative:
            return ["narrative does not reflect failed status"]
        return []

    @classmethod
    def validate_health(cls, result: TraceLookupResult) -> list[str]:
        if not result.health or not result.primary_trace:
            return []
        status = str(getattr(result.primary_trace, "status", "") or "").lower()
        if status == "failed" and result.health.overall in ("Healthy", "Completed"):
            return ["health inconsistent with failed trace status"]
        return []

    @classmethod
    def validate_identifier_collection(cls, result: TraceLookupResult) -> list[str]:
        if not result.primary_trace or not result.identifiers.by_field:
            return []
        from support_trace.identifiers.lookup_keys import identifiers_from_trace

        primary_ids = identifiers_from_trace(result.primary_trace)
        for field, value in primary_ids.items():
            if field not in result.identifiers.by_field:
                return [f"primary identifier {field} missing from collection"]
        return []

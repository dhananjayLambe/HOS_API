"""Policy-governed relationship expansion."""

from __future__ import annotations

from typing import Any

from support_trace.identifiers.relationship_resolver import RelationshipResolver
from support_trace.lookup.investigation_policy import InvestigationPolicy


class RelationshipLookupDelegate:
    @staticmethod
    def expand(
        traces: list[Any],
        *,
        policy: InvestigationPolicy,
    ) -> list[Any]:
        if not traces:
            return []
        related = RelationshipResolver.expand(traces)
        if policy.max_relationship_expansion:
            related = related[: policy.max_relationship_expansion]
        if policy.allowed_workflow_types:
            allowed = policy.allowed_workflow_types
            related = [t for t in related if str(getattr(t, "workflow_type", "")) in allowed]
        if policy.max_graph_depth:
            related = [
                t
                for t in related
                if int(getattr(t, "workflow_depth", 0) or 0) <= policy.max_graph_depth
            ]
        return related

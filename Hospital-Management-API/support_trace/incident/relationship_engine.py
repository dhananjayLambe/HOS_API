"""Relationship expansion for incident journey reconstruction."""

from __future__ import annotations

from typing import Any

from support_trace.identifiers.relationship_resolver import IDENTIFIER_WORKFLOW_CHAIN, RelationshipResolver
from support_trace.identifiers.types import IdentifierType
from support_trace.lookup.types import TraceLookupResult
from support_trace.models import SupportTrace


class RelationshipEngine:
    @classmethod
    def expand_journey(cls, lookup: TraceLookupResult) -> list[Any]:
        traces: list[Any] = []
        if lookup.primary_trace:
            traces.append(lookup.primary_trace)
        if lookup.identifier_lookup:
            for trace in lookup.identifier_lookup.related_traces:
                if trace not in traces:
                    traces.append(trace)
        if lookup.primary_trace and isinstance(lookup.primary_trace, SupportTrace):
            expanded = RelationshipResolver.expand([lookup.primary_trace])
            for trace in expanded:
                if trace not in traces:
                    traces.append(trace)
        return traces

    @classmethod
    def ordered_chain_traces(cls, traces: list[Any]) -> list[Any]:
        """Order traces along IDENTIFIER_WORKFLOW_CHAIN."""
        type_order = {t: i for i, t in enumerate(IDENTIFIER_WORKFLOW_CHAIN)}

        def sort_key(trace: Any) -> int:
            wf = str(getattr(trace, "workflow_type", "") or "")
            for id_type, idx in type_order.items():
                if id_type.value.replace("_", " ").lower() in wf.lower() or wf in id_type.value:
                    return idx
            wf_map = {
                "Consultation": IdentifierType.CONSULTATION,
                "Recommendation": IdentifierType.RECOMMENDATION,
                "Booking": IdentifierType.BOOKING,
                "Routing": IdentifierType.ROUTING,
                "ReportDelivery": IdentifierType.REPORT,
                "WhatsAppDelivery": IdentifierType.WHATSAPP_MESSAGE,
            }
            id_type = wf_map.get(wf)
            if id_type:
                return type_order.get(id_type, 99)
            return 99

        return sorted(traces, key=sort_key)

    @classmethod
    def related_workflow_ids(cls, lookup: TraceLookupResult) -> tuple[str, ...]:
        ids: list[str] = []
        for trace in cls.expand_journey(lookup):
            wf_id = getattr(trace, "workflow_instance_id", None)
            if wf_id and str(wf_id) not in ids:
                ids.append(str(wf_id))
        return tuple(ids)

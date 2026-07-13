"""v1 investigation serializers — domain DTO to JSON."""

from __future__ import annotations

from typing import Any

from support_trace.lookup.types import TraceLookupResult
from support_trace.timeline.types import TimelineResult


def _mask(value: str | None, ctx) -> str | None:
    if value is None:
        return None
    if ctx and ctx.masking_policy.mask_patient_pii and "patient" in str(value).lower():
        text = str(value)
        if len(text) > 8:
            return f"…{text[-8:]}"
    return str(value)


def _trace_to_dict(trace, ctx) -> dict[str, Any] | None:
    if trace is None:
        return None
    return {
        "workflow_instance_id": str(getattr(trace, "workflow_instance_id", "")),
        "workflow_type": getattr(trace, "workflow_type", None),
        "status": getattr(trace, "status", None),
        "current_state": getattr(trace, "current_state", None),
        "workflow_step": getattr(trace, "workflow_step", None),
        "correlation_id": getattr(trace, "correlation_id", None),
        "patient_account_id": _mask(getattr(trace, "patient_account_id", None), ctx),
        "booking_id": getattr(trace, "booking_id", None),
        "retry_count": int(getattr(trace, "retry_count", 0) or 0),
        "duration_ms": getattr(trace, "duration_ms", None),
    }


def _identifier_lookup_to_dict(lookup, ctx) -> dict[str, Any] | None:
    if lookup is None:
        return None
    return {
        "identifier": lookup.identifier,
        "normalized": lookup.normalized,
        "detected_type": str(lookup.detected_type) if lookup.detected_type else None,
        "matched_field": lookup.matched_field,
        "confidence": lookup.confidence,
        "trace_count": lookup.trace_count,
        "related_trace_count": lookup.related_trace_count,
        "search_time_ms": lookup.search_time_ms,
    }


def _timeline_to_dict(timeline, ctx, policy) -> dict[str, Any] | None:
    if timeline is None:
        return None
    events = timeline.events
    max_events = policy.max_timeline_events if policy else len(events)
    if max_events and len(events) > max_events:
        events = events[:max_events]
    return {
        "events": [
            {
                "timeline_sequence": e.timeline_sequence,
                "timestamp": e.timestamp.isoformat() if e.timestamp else None,
                "event": e.event,
                "category": e.category,
                "severity": e.severity,
                "workflow_type": e.workflow_type,
                "summary": e.summary,
                "action": e.action,
            }
            for e in events
        ],
        "statistics": {
            "total_events": timeline.statistics.total_events,
            "clinical_events": timeline.statistics.clinical_events,
            "business_events": timeline.statistics.business_events,
            "failed_events": timeline.statistics.failed_events,
        },
    }


def _graph_to_dict(graph) -> dict[str, Any] | None:
    if graph is None:
        return None
    return {
        "nodes": [
            {
                "workflow_instance_id": n.workflow_instance_id,
                "workflow_type": n.workflow_type,
                "label": n.label,
                "depth": n.depth,
                "status": n.status,
            }
            for n in graph.nodes
        ],
        "edges": [
            {
                "parent": e.parent_workflow_instance_id,
                "child": e.child_workflow_instance_id,
                "edge_type": e.edge_type,
            }
            for e in graph.edges
        ],
        "tree": graph.to_tree(),
    }


def _audit_summary(audit) -> dict[str, Any]:
    return {
        "id": str(getattr(audit, "id", "")),
        "action": getattr(audit, "action", None) or getattr(audit, "event", None),
        "timestamp": (
            getattr(audit, "timestamp", None) or getattr(audit, "created_at", None)
        ),
        "correlation_id": getattr(audit, "correlation_id", None),
    }


def serialize_lookup_result(result: TraceLookupResult, ctx, inv_req=None) -> dict[str, Any]:
    policy = ctx.masking_policy if ctx else None
    payload: dict[str, Any] = {
        "scope": result.scope,
        "level": str(result.level),
        "error_classification": result.error_classification,
        "identifier_lookup": _identifier_lookup_to_dict(result.identifier_lookup, ctx),
        "primary_trace": _trace_to_dict(result.primary_trace, ctx),
    }
    if result.primary_snapshot:
        payload["primary_snapshot"] = {
            "workflow_instance_id": result.primary_snapshot.workflow_instance_id,
            "workflow_type": result.primary_snapshot.workflow_type,
            "current_state": result.primary_snapshot.current_state,
            "status": result.primary_snapshot.status,
            "workflow_health": result.primary_snapshot.workflow_health,
        }
    if result.timeline:
        payload["timeline"] = _timeline_to_dict(result.timeline, ctx, policy)
    if result.workflow_graph:
        payload["workflow_graph"] = _graph_to_dict(result.workflow_graph)
    if result.identifiers and result.identifiers.by_field:
        ids = dict(result.identifiers.by_field)
        if policy and policy.mask_patient_pii:
            for key in ("patient_account_id", "patient_profile_id", "phone_number"):
                if key in ids:
                    ids[key] = _mask(ids[key], ctx)
        payload["identifiers"] = ids
    if result.health:
        payload["health"] = {
            "overall": result.health.overall,
            "workflow": result.health.workflow,
            "communication": result.health.communication,
            "infrastructure": result.health.infrastructure,
            "provider": result.health.provider,
            "aggregate": result.health.aggregate,
        }
    if result.summary:
        payload["summary"] = {
            "structured": {
                "workflow_type": result.summary.structured.workflow_type,
                "current_status": result.summary.structured.current_status,
                "current_step": result.summary.structured.current_step,
                "next_expected_step": result.summary.structured.next_expected_step,
                "duration_display": result.summary.structured.duration_display,
                "retry_count": result.summary.structured.retry_count,
                "failure_count": result.summary.structured.failure_count,
                "patient_label": result.summary.structured.patient_label,
            },
            "narrative": result.summary.narrative.text,
        }
    if result.statistics:
        payload["statistics"] = {
            "timeline_events": result.statistics.timeline_events,
            "clinical_events": result.statistics.clinical_events,
            "business_events": result.statistics.business_events,
            "relationships": result.statistics.relationships,
            "failed_events": result.statistics.failed_events,
            "retries": result.statistics.retries,
        }
    if policy and policy.mask_patient_pii:
        audits = []
        for row in result.clinical_audits[:10]:
            item = _audit_summary(row)
            if item.get("timestamp"):
                item["timestamp"] = item["timestamp"].isoformat()
            audits.append(item)
        payload["clinical_audits"] = audits
        business = []
        for row in result.business_audits[:10]:
            item = _audit_summary(row)
            if item.get("timestamp"):
                item["timestamp"] = item["timestamp"].isoformat()
            business.append(item)
        payload["business_audits"] = business
    elif result.clinical_audits or result.business_audits:
        payload["clinical_audits"] = [
            {**_audit_summary(a), "timestamp": (_audit_summary(a).get("timestamp").isoformat() if _audit_summary(a).get("timestamp") else None)}
            for a in result.clinical_audits[:50]
        ]
        payload["business_audits"] = [
            {**_audit_summary(a), "timestamp": (_audit_summary(a).get("timestamp").isoformat() if _audit_summary(a).get("timestamp") else None)}
            for a in result.business_audits[:50]
        ]
    include_runtime = inv_req and inv_req.options and inv_req.options.include_runtime
    if include_runtime and result.primary_trace:
        runtime_meta = getattr(result.primary_trace, "runtime_metadata", None) or {}
        if runtime_meta:
            payload["runtime"] = dict(runtime_meta)
    return payload


def serialize_timeline_result(result: TimelineResult) -> dict[str, Any]:
    return {
        "scope": result.scope,
        "build_duration_ms": result.build_duration_ms,
        "events": [
            {
                "timeline_sequence": e.timeline_sequence,
                "timestamp": e.timestamp.isoformat() if e.timestamp else None,
                "event": e.event,
                "severity": e.severity,
                "category": e.category,
            }
            for e in result.events
        ],
        "statistics": {
            "total_events": result.statistics.total_events,
            "clinical_events": result.statistics.clinical_events,
            "business_events": result.statistics.business_events,
        },
        "workflow_tree": _graph_to_dict(result.workflow_tree),
    }

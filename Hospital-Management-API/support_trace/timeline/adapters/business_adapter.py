"""Business Audit → TimelineEvent adapter."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from business_audit.enums import EventCategory
from support_trace.timeline.adapters.base import TimelineSourceAdapter
from support_trace.timeline.enums import TimelineCategory, TimelineSource
from support_trace.timeline.event_id import generate_timeline_event_id
from support_trace.timeline.event_registry import EventRegistry
from support_trace.timeline.types import TimelineEvent


def _resolve_timestamp(row: Any) -> datetime:
    started = getattr(row, "started_at", None)
    if started is not None:
        return started if started.tzinfo else started.replace(tzinfo=timezone.utc)
    created = getattr(row, "created_at", None)
    if created is None:
        return datetime.now(timezone.utc)
    return created if created.tzinfo else created.replace(tzinfo=timezone.utc)


def _infer_category(row: Any, action: str) -> str:
    category = str(getattr(row, "category", "") or "")
    if category == EventCategory.DELIVERY or "communication" in action or "whatsapp" in action:
        return TimelineCategory.COMMUNICATION
    if category == EventCategory.ROUTING or action.startswith("routing."):
        return TimelineCategory.DECISION
    if action.startswith("workflow."):
        return TimelineCategory.WORKFLOW
    return TimelineCategory.BUSINESS


def _extract_patient_id(row: Any) -> str | None:
    payload = (getattr(row, "new_value", None) or {}).get("payload") or {}
    if isinstance(payload, dict):
        return payload.get("patient_account_id") or payload.get("patient_id")
    return None


def _extract_consultation_id(row: Any) -> str | None:
    payload = (getattr(row, "new_value", None) or {}).get("payload") or {}
    if isinstance(payload, dict):
        return payload.get("consultation_id")
    return None


class BusinessAdapter:
    source_type = TimelineSource.BUSINESS_AUDIT

    def adapt(
        self,
        row: Any,
        *,
        registry: type[EventRegistry] = EventRegistry,
    ) -> TimelineEvent | None:
        action = str(getattr(row, "action", "") or "")
        event_label = str(getattr(row, "event", "") or action)
        timestamp = _resolve_timestamp(row)
        reference_id = str(getattr(row, "id", ""))
        if not reference_id:
            return None
        fallback_category = _infer_category(row, action)
        spec = registry.resolve(
            action,
            fallback_event=event_label,
            fallback_category=fallback_category,
        )
        return TimelineEvent(
            timeline_event_id=generate_timeline_event_id(
                reference_type="business_audit",
                reference_id=reference_id,
                timestamp=timestamp,
            ),
            timestamp=timestamp,
            timeline_sequence=0,
            event=spec.title,
            category=spec.category,
            severity=spec.severity,
            tags=spec.tags,
            source=TimelineSource.BUSINESS_AUDIT,
            workflow_type=str(getattr(row, "workflow_type", "") or "") or None,
            workflow_instance_id=getattr(row, "workflow_instance_id", None),
            parent_workflow_instance_id=getattr(row, "parent_workflow_instance_id", None),
            correlation_id=getattr(row, "correlation_id", None),
            patient_account_id=_extract_patient_id(row),
            consultation_id=_extract_consultation_id(row),
            resource_type=str(getattr(row, "resource_type", "") or "") or None,
            resource_id=str(getattr(row, "resource_id", "") or "") or None,
            actor=str(getattr(row, "user_id", "") or "") or str(
                getattr(row, "actor_type", "") or ""
            )
            or None,
            status=str(getattr(row, "status", "") or "") or None,
            state_before=getattr(row, "state_before", None),
            state_after=getattr(row, "state_after", None),
            summary=spec.default_summary,
            reference_id=reference_id,
            reference_type="business_audit",
            sequence_no=getattr(row, "sequence_no", None),
            action=action or None,
            display_icon=spec.icon,
            display_color=spec.color,
        )

    def adapt_many(
        self,
        rows: list[Any],
        *,
        registry: type[EventRegistry] = EventRegistry,
    ) -> list[TimelineEvent]:
        events: list[TimelineEvent] = []
        for row in rows:
            event = self.adapt(row, registry=registry)
            if event is not None:
                events.append(event)
        return events

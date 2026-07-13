"""Clinical Audit → TimelineEvent adapter."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from support_trace.timeline.adapters.base import TimelineSourceAdapter
from support_trace.timeline.enums import TimelineCategory, TimelineSource
from support_trace.timeline.event_id import generate_timeline_event_id
from support_trace.timeline.event_registry import EventRegistry
from support_trace.timeline.types import TimelineEvent


def _resolve_timestamp(row: Any) -> datetime:
    new_value = getattr(row, "new_value", None) or {}
    if isinstance(new_value, dict):
        meta = new_value.get("_meta") or {}
        occurred = meta.get("occurred_at")
        if occurred:
            if isinstance(occurred, datetime):
                return occurred if occurred.tzinfo else occurred.replace(tzinfo=timezone.utc)
            try:
                parsed = datetime.fromisoformat(str(occurred).replace("Z", "+00:00"))
                return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
            except ValueError:
                pass
    ts = getattr(row, "timestamp", None)
    if ts is None:
        return datetime.now(timezone.utc)
    return ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)


def _infer_category(action: str) -> str:
    if action.startswith("authentication."):
        return TimelineCategory.SECURITY
    return TimelineCategory.CLINICAL


class ClinicalAdapter:
    source_type = TimelineSource.CLINICAL_AUDIT

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
        spec = registry.resolve(
            action,
            fallback_event=event_label,
            fallback_category=_infer_category(action),
        )
        return TimelineEvent(
            timeline_event_id=generate_timeline_event_id(
                reference_type="clinical_audit",
                reference_id=reference_id,
                timestamp=timestamp,
            ),
            timestamp=timestamp,
            timeline_sequence=0,
            event=spec.title,
            category=spec.category,
            severity=spec.severity,
            tags=spec.tags,
            source=TimelineSource.CLINICAL_AUDIT,
            workflow_type=None,
            workflow_instance_id=None,
            parent_workflow_instance_id=None,
            correlation_id=getattr(row, "correlation_id", None),
            patient_account_id=getattr(row, "patient_account_id", None),
            consultation_id=getattr(row, "consultation_id", None),
            resource_type=getattr(row, "resource_type", None),
            resource_id=getattr(row, "resource_id", None),
            actor=getattr(row, "user_id", None) or getattr(row, "source", None),
            status=getattr(row, "outcome", None),
            state_before=None,
            state_after=None,
            summary=spec.default_summary,
            reference_id=reference_id,
            reference_type="clinical_audit",
            sequence_no=None,
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

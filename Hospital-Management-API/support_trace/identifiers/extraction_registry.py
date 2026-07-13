"""Aggregates strategy extraction from audit rows."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

from support_trace.domain.sync_event import SupportTraceSyncEvent
from support_trace.enums import TraceSource
from support_trace.identifiers.identifier_registry import IdentifierRegistry
from support_trace.identifiers.lookup_keys import IDENTIFIER_FIELDS


class ExtractionRegistry:
    @classmethod
    def extract(cls, audit: Any, *, source: str) -> dict[str, str]:
        adapted = cls._adapt(audit, source=source)
        is_clinical = source == TraceSource.CLINICAL_AUDIT or source == str(
            TraceSource.CLINICAL_AUDIT
        )
        ids: dict[str, str] = {}
        for strategy in IdentifierRegistry.all_strategies():
            if is_clinical:
                raw = strategy.extract_from_clinical_audit(adapted)
            else:
                raw = strategy.extract_from_business_audit(adapted)
            if raw and strategy.field_name in IDENTIFIER_FIELDS:
                ids[strategy.field_name] = raw
        return ids

    @classmethod
    def _adapt(cls, audit: Any, *, source: str) -> Any:
        if isinstance(audit, SupportTraceSyncEvent):
            payload = dict(audit.payload or {})
            if audit.identifiers:
                for key, value in audit.identifiers.items():
                    payload.setdefault(key, value)
            return SimpleNamespace(
                payload=payload,
                resource_type=audit.resource_type,
                resource_id=audit.resource_id,
                workflow_type=audit.workflow_type,
                provider_reference=payload.get("provider_reference"),
                patient_account_id=payload.get("patient_account_id"),
                patient_profile_id=payload.get("patient_profile_id"),
                consultation_id=payload.get("consultation_id"),
                encounter_id=payload.get("encounter_id"),
            )
        return audit

    @classmethod
    def merge(cls, *sources: dict[str, str] | None) -> dict[str, str]:
        merged: dict[str, str] = {}
        for source in sources:
            if not source:
                continue
            for key, value in source.items():
                if key in IDENTIFIER_FIELDS and value:
                    merged[key] = value
        return merged

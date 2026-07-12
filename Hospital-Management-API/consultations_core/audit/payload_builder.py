"""Payload builders for consultation audit events."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from clinical_audit.domain.utils import sanitize_audit_payload

from consultations_core.audit.constants import MAX_CHANGED_FIELDS
from consultations_core.audit.statistics_builder import ConsultationCompletionStats


class ConsultationAuditPayloadBuilder:
    """Builds sanitized payload dicts for consultation audit events."""

    @staticmethod
    def build_started(
        *,
        encounter,
        source: str,
        started_at: datetime | None = None,
    ) -> dict[str, Any]:
        payload = {
            "status": "started",
            "consultation_mode": getattr(encounter, "encounter_type", None),
            "started_at": (started_at or getattr(encounter, "consultation_start_time", None)),
            "source": source,
            "visit_pnr": getattr(encounter, "visit_pnr", None),
        }
        if payload["started_at"] is not None and hasattr(payload["started_at"], "isoformat"):
            payload["started_at"] = payload["started_at"].isoformat()
        return sanitize_audit_payload(payload)

    @staticmethod
    def build_section_updated(*, section: str, changed_fields: list[str] | None = None) -> dict[str, Any]:
        fields = list(changed_fields or [])
        if len(fields) > MAX_CHANGED_FIELDS:
            fields = fields[:MAX_CHANGED_FIELDS]
        return sanitize_audit_payload(
            {
                "section": section,
                "changed_fields": fields,
            }
        )

    @staticmethod
    def build_findings_updated(*, changed_fields: list[str] | None = None) -> dict[str, Any]:
        return ConsultationAuditPayloadBuilder.build_section_updated(
            section="findings",
            changed_fields=changed_fields,
        )

    @staticmethod
    def build_instructions_updated(*, changed_fields: list[str] | None = None) -> dict[str, Any]:
        return ConsultationAuditPayloadBuilder.build_section_updated(
            section="instructions",
            changed_fields=changed_fields,
        )

    @staticmethod
    def build_investigations_updated(*, changed_fields: list[str] | None = None) -> dict[str, Any]:
        return ConsultationAuditPayloadBuilder.build_section_updated(
            section="investigations",
            changed_fields=changed_fields,
        )

    @staticmethod
    def build_completed(
        *,
        stats: ConsultationCompletionStats,
        consultation,
        encounter,
        completion_source: str,
    ) -> dict[str, Any]:
        return sanitize_audit_payload(
            {
                "duration_minutes": stats.duration_minutes,
                "prescription_created": stats.prescription_created,
                "diagnosis_count": stats.diagnosis_count,
                "tests_ordered": stats.tests_ordered,
                "follow_up_required": stats.follow_up_required,
                "consultation_status": "finalized" if consultation.is_finalized else "open",
                "encounter_status": encounter.status,
                "completion_source": completion_source,
            }
        )

    @staticmethod
    def build_cancelled(
        *,
        reason: str | None,
        cancelled_by: str | None,
        prior_status: str | None,
    ) -> dict[str, Any]:
        return sanitize_audit_payload(
            {
                "reason": reason,
                "cancelled_by": cancelled_by,
                "prior_status": prior_status,
            }
        )

    @staticmethod
    def build_reopened(
        *,
        reason: str | None,
        reopened_by: str | None,
        prior_completed_at: datetime | None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "reason": reason,
            "reopened_by": reopened_by,
            "prior_completed_at": None,
        }
        if prior_completed_at is not None:
            payload["prior_completed_at"] = prior_completed_at.isoformat()
        return sanitize_audit_payload(payload)

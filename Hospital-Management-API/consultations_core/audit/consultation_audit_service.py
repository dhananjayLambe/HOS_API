"""Thin facade for consultation clinical audit events."""

from __future__ import annotations

import logging
from typing import Any

from clinical_audit.domain.repository import ClinicalAuditRepository
from clinical_audit.domain.snapshots.consultation_snapshot import build_consultation_snapshot
from clinical_audit.domain.types import AuditRecordResult
from clinical_audit.domain.utils import audit_event_label, sanitize_audit_snapshot
from clinical_audit.enums import AuditAction, AuditSource, ClinicalEntity
from clinical_audit.services import ClinicalAuditService

from consultations_core.audit.constants import SERVICE_NAME, SOURCE_TO_AUDIT_SOURCE
from consultations_core.audit.payload_builder import ConsultationAuditPayloadBuilder
from consultations_core.audit.statistics_builder import ConsultationStatisticsBuilder

logger = logging.getLogger(__name__)


class ConsultationAuditService:
    """Translate consultation events into ClinicalAuditService.record() calls."""

    _repository = ClinicalAuditRepository()

    @classmethod
    def emit_started(
        cls,
        encounter,
        consultation,
        user,
        *,
        source: str = "doctor",
        already_started: bool = False,
        correlation_id: str | None = None,
    ) -> AuditRecordResult | None:
        if already_started:
            return None
        payload = ConsultationAuditPayloadBuilder.build_started(
            encounter=encounter,
            source=source,
            started_at=getattr(consultation, "started_at", None),
        )
        return cls._record(
            action=AuditAction.CONSULTATION_STARTED,
            encounter=encounter,
            consultation=consultation,
            user=user,
            source=source,
            payload=payload,
            correlation_id=correlation_id,
        )

    @classmethod
    def emit_findings_updated(
        cls,
        encounter,
        consultation,
        user,
        *,
        changed_fields: list[str] | None = None,
        snapshot: dict[str, Any] | None = None,
        correlation_id: str | None = None,
    ) -> AuditRecordResult:
        return cls._emit_section_updated(
            action=AuditAction.CONSULTATION_FINDINGS_UPDATED,
            encounter=encounter,
            consultation=consultation,
            user=user,
            changed_fields=changed_fields,
            snapshot=snapshot,
            build_payload=ConsultationAuditPayloadBuilder.build_findings_updated,
            correlation_id=correlation_id,
        )

    @classmethod
    def emit_instructions_updated(
        cls,
        encounter,
        consultation,
        user,
        *,
        changed_fields: list[str] | None = None,
        snapshot: dict[str, Any] | None = None,
        correlation_id: str | None = None,
    ) -> AuditRecordResult:
        return cls._emit_section_updated(
            action=AuditAction.CONSULTATION_INSTRUCTIONS_UPDATED,
            encounter=encounter,
            consultation=consultation,
            user=user,
            changed_fields=changed_fields,
            snapshot=snapshot,
            build_payload=ConsultationAuditPayloadBuilder.build_instructions_updated,
            correlation_id=correlation_id,
        )

    @classmethod
    def emit_investigations_updated(
        cls,
        encounter,
        consultation,
        user,
        *,
        changed_fields: list[str] | None = None,
        snapshot: dict[str, Any] | None = None,
        correlation_id: str | None = None,
    ) -> AuditRecordResult:
        return cls._emit_section_updated(
            action=AuditAction.CONSULTATION_INVESTIGATIONS_UPDATED,
            encounter=encounter,
            consultation=consultation,
            user=user,
            changed_fields=changed_fields,
            snapshot=snapshot,
            build_payload=ConsultationAuditPayloadBuilder.build_investigations_updated,
            correlation_id=correlation_id,
        )

    @classmethod
    def emit_completed(
        cls,
        encounter,
        consultation,
        user,
        *,
        completion_source: str = "doctor",
        correlation_id: str | None = None,
    ) -> AuditRecordResult | None:
        if cls._has_existing_action(
            resource_id=str(consultation.id),
            action=AuditAction.CONSULTATION_COMPLETED,
        ):
            return None
        stats = ConsultationStatisticsBuilder.build_completion_stats(consultation)
        payload = ConsultationAuditPayloadBuilder.build_completed(
            stats=stats,
            consultation=consultation,
            encounter=encounter,
            completion_source=completion_source,
        )
        return cls._record(
            action=AuditAction.CONSULTATION_COMPLETED,
            encounter=encounter,
            consultation=consultation,
            user=user,
            source=completion_source,
            payload=payload,
            correlation_id=correlation_id,
        )

    @classmethod
    def emit_cancelled(
        cls,
        encounter,
        user,
        *,
        reason: str | None = None,
        prior_status: str | None = None,
        consultation=None,
        snapshot: dict[str, Any] | None = None,
        source: str = "doctor",
        correlation_id: str | None = None,
    ) -> AuditRecordResult | None:
        resource_id = str(consultation.id) if consultation is not None else str(encounter.id)
        if cls._has_existing_action(
            resource_id=resource_id,
            action=AuditAction.CONSULTATION_CANCELLED,
        ):
            return None
        payload = ConsultationAuditPayloadBuilder.build_cancelled(
            reason=reason,
            cancelled_by=str(getattr(user, "pk", "")) or None,
            prior_status=prior_status,
        )
        return cls._record(
            action=AuditAction.CONSULTATION_CANCELLED,
            encounter=encounter,
            consultation=consultation,
            user=user,
            source=source,
            payload=payload,
            snapshot=snapshot,
            resource_id_override=resource_id if consultation is None else None,
            validate_references=False,
            correlation_id=correlation_id,
        )

    @classmethod
    def emit_reopened(
        cls,
        encounter,
        consultation,
        user,
        *,
        reason: str | None = None,
        prior_completed_at=None,
        snapshot: dict[str, Any] | None = None,
        source: str = "doctor",
    ) -> AuditRecordResult:
        payload = ConsultationAuditPayloadBuilder.build_reopened(
            reason=reason,
            reopened_by=str(getattr(user, "pk", "")) or None,
            prior_completed_at=prior_completed_at,
        )
        return cls._record(
            action=AuditAction.CONSULTATION_REOPENED,
            encounter=encounter,
            consultation=consultation,
            user=user,
            source=source,
            payload=payload,
            snapshot=snapshot,
        )

    @classmethod
    def _emit_section_updated(
        cls,
        *,
        action: AuditAction,
        encounter,
        consultation,
        user,
        changed_fields: list[str] | None,
        snapshot: dict[str, Any] | None,
        build_payload,
        correlation_id: str | None = None,
    ) -> AuditRecordResult:
        payload = build_payload(changed_fields=changed_fields)
        return cls._record(
            action=action,
            encounter=encounter,
            consultation=consultation,
            user=user,
            source="doctor",
            payload=payload,
            snapshot=snapshot,
            correlation_id=correlation_id,
        )

    @classmethod
    def _record(
        cls,
        *,
        action: AuditAction,
        encounter,
        consultation,
        user,
        source: str,
        payload: dict[str, Any],
        snapshot: dict[str, Any] | None = None,
        resource_id_override: str | None = None,
        validate_references: bool = True,
        correlation_id: str | None = None,
    ) -> AuditRecordResult:
        audit_source = cls._map_source(source)
        sanitized_snapshot = None
        if snapshot is not None:
            sanitized_snapshot = sanitize_audit_snapshot(snapshot)
        resource_id = resource_id_override or (
            str(consultation.id) if consultation is not None else str(encounter.id)
        )
        return ClinicalAuditService.record(
            action=action,
            event=audit_event_label(action),
            resource_type=ClinicalEntity.CONSULTATION,
            resource_id=resource_id,
            source=audit_source,
            user_id=str(getattr(user, "pk", "")),
            organization_id=str(encounter.clinic_id),
            patient_account_id=str(encounter.patient_account_id),
            patient_profile_id=str(encounter.patient_profile_id),
            consultation_id=(
                str(consultation.id) if consultation is not None else None
            ),
            encounter_id=str(encounter.id),
            payload=payload,
            snapshot=sanitized_snapshot,
            service_name=SERVICE_NAME,
            validate_references=validate_references,
            correlation_id=correlation_id,
        )

    @staticmethod
    def _map_source(source: str) -> AuditSource:
        mapped = SOURCE_TO_AUDIT_SOURCE.get(source, "system")
        return AuditSource(mapped)

    @classmethod
    def _has_existing_action(cls, *, resource_id: str, action: AuditAction) -> bool:
        rows = cls._repository.filter_by_resource(
            ClinicalEntity.CONSULTATION,
            resource_id,
        )
        return any(row.action == action for row in rows)

    @staticmethod
    def capture_snapshot(encounter, consultation) -> dict[str, Any]:
        return build_consultation_snapshot(encounter=encounter, consultation=consultation)

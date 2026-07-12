"""Thin facade for clinical documentation audit events."""

from __future__ import annotations

import logging
from typing import Any

from clinical_audit.domain.repository import ClinicalAuditRepository
from clinical_audit.domain.types import AuditRecordResult
from clinical_audit.domain.utils import audit_event_label, sanitize_audit_snapshot
from clinical_audit.enums import AuditAction, AuditSource, ClinicalEntity
from clinical_audit.services import ClinicalAuditService

from clinical_documentation.audit.constants import SERVICE_NAME, SOURCE_TO_AUDIT_SOURCE
from clinical_documentation.audit.payload_builder import ClinicalDocumentationPayloadBuilder
from clinical_documentation.audit.snapshot_builder import ClinicalDocumentationSnapshotBuilder

logger = logging.getLogger(__name__)


class ClinicalDocumentationAuditService:
    """Translate clinical documentation events into ClinicalAuditService.record() calls."""

    _repository = ClinicalAuditRepository()

    @classmethod
    def emit_diagnosis_added(
        cls,
        encounter,
        consultation,
        user,
        *,
        diagnosis_row,
        source: str = "doctor",
        correlation_id: str | None = None,
    ) -> AuditRecordResult | None:
        resource_id = str(diagnosis_row.id)
        if cls._has_existing_action(
            resource_type=ClinicalEntity.DIAGNOSIS,
            resource_id=resource_id,
            action=AuditAction.DIAGNOSIS_ADDED,
        ):
            return None
        payload = ClinicalDocumentationPayloadBuilder.build_diagnosis_added(
            diagnosis_row=diagnosis_row
        )
        return cls._record(
            action=AuditAction.DIAGNOSIS_ADDED,
            resource_type=ClinicalEntity.DIAGNOSIS,
            resource_id=resource_id,
            encounter=encounter,
            consultation=consultation,
            user=user,
            source=source,
            payload=payload,
            correlation_id=correlation_id,
        )

    @classmethod
    def emit_diagnosis_updated(
        cls,
        encounter,
        consultation,
        user,
        *,
        diagnosis_row,
        changed_fields: list[str] | None,
        prior_state: dict[str, Any] | None = None,
        source: str = "doctor",
        correlation_id: str | None = None,
    ) -> AuditRecordResult | None:
        fields = list(changed_fields or [])
        if not fields:
            return None
        payload = ClinicalDocumentationPayloadBuilder.build_diagnosis_updated(
            changed_fields=fields
        )
        snapshot = ClinicalDocumentationSnapshotBuilder.build_diagnosis_snapshot(
            prior_state=prior_state
        )
        return cls._record(
            action=AuditAction.DIAGNOSIS_UPDATED,
            resource_type=ClinicalEntity.DIAGNOSIS,
            resource_id=str(diagnosis_row.id),
            encounter=encounter,
            consultation=consultation,
            user=user,
            source=source,
            payload=payload,
            snapshot=snapshot,
            correlation_id=correlation_id,
        )

    @classmethod
    def emit_allergy_added(
        cls,
        encounter,
        user,
        *,
        section_id,
        allergy_entry: dict[str, Any],
        consultation=None,
        source: str = "doctor",
        correlation_id: str | None = None,
    ) -> AuditRecordResult | None:
        allergen_key = str(allergy_entry.get("allergen", "")).strip().lower()
        resource_id = f"{section_id}:{allergen_key}"
        if cls._has_existing_action(
            resource_type=ClinicalEntity.ALLERGY,
            resource_id=resource_id,
            action=AuditAction.ALLERGY_ADDED,
        ):
            return None
        payload = ClinicalDocumentationPayloadBuilder.build_allergy_added(
            allergy_entry=allergy_entry
        )
        return cls._record(
            action=AuditAction.ALLERGY_ADDED,
            resource_type=ClinicalEntity.ALLERGY,
            resource_id=resource_id,
            encounter=encounter,
            consultation=consultation,
            user=user,
            source=source,
            payload=payload,
            correlation_id=correlation_id,
        )

    @classmethod
    def emit_allergy_updated(
        cls,
        encounter,
        user,
        *,
        section_id,
        allergy_key: str,
        changed_fields: list[str] | None,
        prior_entry: dict[str, Any] | None = None,
        consultation=None,
        source: str = "doctor",
        correlation_id: str | None = None,
    ) -> AuditRecordResult | None:
        fields = list(changed_fields or [])
        if not fields:
            return None
        payload = ClinicalDocumentationPayloadBuilder.build_allergy_updated(
            changed_fields=fields
        )
        snapshot = ClinicalDocumentationSnapshotBuilder.build_allergy_snapshot(
            prior_entry=prior_entry
        )
        resource_id = f"{section_id}:{allergy_key}"
        return cls._record(
            action=AuditAction.ALLERGY_UPDATED,
            resource_type=ClinicalEntity.ALLERGY,
            resource_id=resource_id,
            encounter=encounter,
            consultation=consultation,
            user=user,
            source=source,
            payload=payload,
            snapshot=snapshot,
            correlation_id=correlation_id,
        )

    @classmethod
    def emit_clinical_notes_updated(
        cls,
        encounter,
        user,
        *,
        resource_id: str,
        section: str,
        changed_fields: list[str] | None,
        prior_content: str | None = None,
        consultation=None,
        source: str = "doctor",
        correlation_id: str | None = None,
    ) -> AuditRecordResult | None:
        fields = list(changed_fields or [])
        if not fields:
            return None
        payload = ClinicalDocumentationPayloadBuilder.build_clinical_notes_updated(
            section=section,
            changed_fields=fields,
        )
        snapshot = ClinicalDocumentationSnapshotBuilder.build_clinical_notes_snapshot(
            section=section,
            prior_content=prior_content,
        )
        return cls._record(
            action=AuditAction.CLINICAL_NOTES_UPDATED,
            resource_type=ClinicalEntity.CLINICAL_NOTES,
            resource_id=resource_id,
            encounter=encounter,
            consultation=consultation,
            user=user,
            source=source,
            payload=payload,
            snapshot=snapshot,
            correlation_id=correlation_id,
        )

    @classmethod
    def emit_vital_signs_recorded(
        cls,
        encounter,
        user,
        *,
        section_id,
        vitals_data: dict[str, Any],
        consultation=None,
        source: str = "doctor",
        correlation_id: str | None = None,
    ) -> AuditRecordResult:
        payload = ClinicalDocumentationPayloadBuilder.build_vital_signs_recorded(
            vitals_data=vitals_data
        )
        return cls._record(
            action=AuditAction.VITAL_SIGNS_RECORDED,
            resource_type=ClinicalEntity.VITAL_SIGNS,
            resource_id=str(section_id),
            encounter=encounter,
            consultation=consultation,
            user=user,
            source=source,
            payload=payload,
            correlation_id=correlation_id,
        )

    @classmethod
    def emit_symptoms_recorded(
        cls,
        encounter,
        consultation,
        user,
        *,
        symptom_row,
        chief_complaint: str | None = None,
        symptom_names: list[str] | None = None,
        source: str = "doctor",
        correlation_id: str | None = None,
    ) -> AuditRecordResult:
        payload = ClinicalDocumentationPayloadBuilder.build_symptoms_recorded(
            symptom_row=symptom_row,
            chief_complaint=chief_complaint,
            symptom_names=symptom_names,
        )
        return cls._record(
            action=AuditAction.SYMPTOMS_RECORDED,
            resource_type=ClinicalEntity.SYMPTOMS,
            resource_id=str(symptom_row.id),
            encounter=encounter,
            consultation=consultation,
            user=user,
            source=source,
            payload=payload,
            correlation_id=correlation_id,
        )

    @classmethod
    def _record(
        cls,
        *,
        action: AuditAction,
        resource_type: ClinicalEntity,
        resource_id: str,
        encounter,
        consultation,
        user,
        source: str,
        payload: dict[str, Any],
        snapshot: dict[str, Any] | None = None,
        correlation_id: str | None = None,
    ) -> AuditRecordResult:
        audit_source = cls._map_source(source)
        sanitized_snapshot = None
        if snapshot is not None:
            sanitized_snapshot = sanitize_audit_snapshot(snapshot)
        return ClinicalAuditService.record(
            action=action,
            event=audit_event_label(action),
            resource_type=resource_type,
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
            correlation_id=correlation_id,
        )

    @staticmethod
    def _map_source(source: str) -> AuditSource:
        mapped = SOURCE_TO_AUDIT_SOURCE.get(source, "system")
        return AuditSource(mapped)

    @classmethod
    def _has_existing_action(
        cls,
        *,
        resource_type: ClinicalEntity,
        resource_id: str,
        action: AuditAction,
    ) -> bool:
        rows = cls._repository.filter_by_resource(resource_type, resource_id)
        return any(row.action == action for row in rows)

    @staticmethod
    def capture_diagnosis_prior_state(diagnosis_row) -> dict[str, Any]:
        return ClinicalDocumentationPayloadBuilder.diagnosis_state_from_row(diagnosis_row)

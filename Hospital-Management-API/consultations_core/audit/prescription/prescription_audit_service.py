"""Thin facade for prescription and recommendation audit events."""

from __future__ import annotations

import logging
from typing import Any

from clinical_audit.domain.repository import ClinicalAuditRepository
from clinical_audit.domain.types import AuditRecordResult
from clinical_audit.domain.utils import audit_event_label, sanitize_audit_snapshot
from clinical_audit.enums import AuditAction, AuditSource, ClinicalEntity
from clinical_audit.services import ClinicalAuditService

from consultations_core.audit.prescription.constants import SERVICE_NAME, SOURCE_TO_AUDIT_SOURCE
from consultations_core.audit.prescription.prescription_payload_builder import (
    PrescriptionPayloadBuilder,
)
from consultations_core.audit.prescription.prescription_snapshot_builder import (
    PrescriptionSnapshotBuilder,
)
from consultations_core.audit.prescription.recommendation_payload_builder import (
    RecommendationPayloadBuilder,
)
from consultations_core.audit.prescription.recommendation_snapshot_builder import (
    RecommendationSnapshotBuilder,
)

logger = logging.getLogger(__name__)


class PrescriptionAuditService:
    """Translate prescription/recommendation events into ClinicalAuditService.record() calls."""

    _repository = ClinicalAuditRepository()

    @classmethod
    def emit_prescription_created(
        cls,
        encounter,
        consultation,
        user,
        *,
        prescription,
        source: str = "doctor",
        correlation_id: str | None = None,
    ) -> AuditRecordResult | None:
        resource_id = str(prescription.id)
        if cls._has_existing_action(
            resource_type=ClinicalEntity.PRESCRIPTION,
            resource_id=resource_id,
            action=AuditAction.PRESCRIPTION_CREATED,
        ):
            return None
        medicine_count = PrescriptionPayloadBuilder.medicine_count_for(prescription)
        payload = PrescriptionPayloadBuilder.build_created(medicine_count=medicine_count)
        return cls._record(
            action=AuditAction.PRESCRIPTION_CREATED,
            resource_type=ClinicalEntity.PRESCRIPTION,
            resource_id=resource_id,
            encounter=encounter,
            consultation=consultation,
            user=user,
            source=source,
            payload=payload,
            correlation_id=correlation_id,
        )

    @classmethod
    def emit_prescription_updated(
        cls,
        encounter,
        consultation,
        user,
        *,
        prescription,
        changed_fields: list[str] | None,
        prior_state: dict[str, Any] | None = None,
        source: str = "doctor",
        correlation_id: str | None = None,
    ) -> AuditRecordResult | None:
        fields = list(changed_fields or [])
        if not fields:
            return None
        payload = PrescriptionPayloadBuilder.build_updated(changed_fields=fields)
        snapshot = PrescriptionSnapshotBuilder.build_prescription_snapshot(
            prior_state=prior_state
        )
        return cls._record(
            action=AuditAction.PRESCRIPTION_UPDATED,
            resource_type=ClinicalEntity.PRESCRIPTION,
            resource_id=str(prescription.id),
            encounter=encounter,
            consultation=consultation,
            user=user,
            source=source,
            payload=payload,
            snapshot=snapshot,
            correlation_id=correlation_id,
        )

    @classmethod
    def emit_prescription_signed(
        cls,
        encounter,
        consultation,
        user,
        *,
        prescription,
        source: str = "doctor",
        correlation_id: str | None = None,
    ) -> AuditRecordResult | None:
        resource_id = str(prescription.id)
        if cls._has_existing_action(
            resource_type=ClinicalEntity.PRESCRIPTION,
            resource_id=resource_id,
            action=AuditAction.PRESCRIPTION_SIGNED,
        ):
            return None
        payload = PrescriptionPayloadBuilder.build_signed(
            finalized_at=getattr(prescription, "finalized_at", None),
            doctor_license=PrescriptionPayloadBuilder.resolve_doctor_license(encounter),
        )
        return cls._record(
            action=AuditAction.PRESCRIPTION_SIGNED,
            resource_type=ClinicalEntity.PRESCRIPTION,
            resource_id=resource_id,
            encounter=encounter,
            consultation=consultation,
            user=user,
            source=source,
            payload=payload,
            correlation_id=correlation_id,
        )

    @classmethod
    def emit_prescription_downloaded(
        cls,
        encounter,
        consultation,
        user,
        *,
        prescription,
        downloaded_by: str,
        source: str = "patient",
        correlation_id: str | None = None,
    ) -> AuditRecordResult:
        payload = PrescriptionPayloadBuilder.build_downloaded(downloaded_by=downloaded_by)
        return cls._record(
            action=AuditAction.PRESCRIPTION_DOWNLOADED,
            resource_type=ClinicalEntity.PRESCRIPTION,
            resource_id=str(prescription.id),
            encounter=encounter,
            consultation=consultation,
            user=user,
            source=source,
            payload=payload,
            correlation_id=correlation_id,
        )

    @classmethod
    def emit_recommendation_generated(
        cls,
        encounter,
        consultation,
        user,
        *,
        recommendation_id,
        result=None,
        source: str = "doctor",
        correlation_id: str | None = None,
    ) -> AuditRecordResult | None:
        resource_id = str(recommendation_id)
        if cls._has_existing_action(
            resource_type=ClinicalEntity.RECOMMENDATION,
            resource_id=resource_id,
            action=AuditAction.RECOMMENDATION_GENERATED,
        ):
            return None
        payload = RecommendationPayloadBuilder.build_generated(
            recommendation_count=RecommendationPayloadBuilder.count_from_result(result),
        )
        return cls._record(
            action=AuditAction.RECOMMENDATION_GENERATED,
            resource_type=ClinicalEntity.RECOMMENDATION,
            resource_id=resource_id,
            encounter=encounter,
            consultation=consultation,
            user=user,
            source=source,
            payload=payload,
            correlation_id=correlation_id,
        )

    @classmethod
    def emit_recommendation_accepted(
        cls,
        encounter,
        consultation,
        user,
        *,
        recommendation_id,
        accepted_items: int = 0,
        rejected_items: int = 0,
        prior_accepted_items: int | None = None,
        prior_rejected_items: int | None = None,
        source: str = "doctor",
        correlation_id: str | None = None,
    ) -> AuditRecordResult | None:
        resource_id = str(recommendation_id)
        if cls._has_existing_action(
            resource_type=ClinicalEntity.RECOMMENDATION,
            resource_id=resource_id,
            action=AuditAction.RECOMMENDATION_ACCEPTED,
        ):
            return None
        payload = RecommendationPayloadBuilder.build_accepted(
            accepted_items=accepted_items,
            rejected_items=rejected_items,
        )
        snapshot = RecommendationSnapshotBuilder.build_acceptance_snapshot(
            prior_accepted_items=prior_accepted_items,
            prior_rejected_items=prior_rejected_items,
        )
        return cls._record(
            action=AuditAction.RECOMMENDATION_ACCEPTED,
            resource_type=ClinicalEntity.RECOMMENDATION,
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
    def resolve_downloaded_by(cls, request) -> str:
        user = getattr(request, "user", None)
        if user is None or not getattr(user, "is_authenticated", False):
            return "Anonymous"
        groups = set(
            user.groups.values_list("name", flat=True)
            if hasattr(user, "groups")
            else []
        )
        if "doctor" in groups:
            return "Doctor"
        if "patient" in groups:
            return "Patient"
        if "helpdesk" in groups:
            return "Helpdesk"
        if "admin" in groups:
            return "Admin"
        return "Authenticated"

    @classmethod
    def resolve_download_source(cls, request) -> str:
        downloaded_by = cls.resolve_downloaded_by(request)
        mapping = {
            "Doctor": "doctor",
            "Patient": "patient",
            "Helpdesk": "helpdesk",
            "Admin": "admin",
            "Authenticated": "system",
            "Anonymous": "patient",
        }
        return mapping.get(downloaded_by, "patient")

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
        user_id = ""
        if user is not None and getattr(user, "is_authenticated", False):
            user_id = str(getattr(user, "pk", ""))
        if not user_id:
            user_id = "anonymous"
        return ClinicalAuditService.record(
            action=action,
            event=audit_event_label(action),
            resource_type=resource_type,
            resource_id=resource_id,
            source=audit_source,
            user_id=user_id,
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

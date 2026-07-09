"""Construct immutable ClinicalAudit instances from validated input."""

from __future__ import annotations

import uuid

from shared.logging.context import get_context_manager

from clinical_audit.domain.types import ValidatedAuditRequest
from clinical_audit.domain.utils import build_new_value_envelope
from clinical_audit.exceptions import AuditBuilderError
from clinical_audit.models import ClinicalAudit


class ClinicalAuditBuilder:
    """Builds unsaved ClinicalAudit model instances with auto metadata."""

    @classmethod
    def build(cls, validated: ValidatedAuditRequest) -> ClinicalAudit:
        try:
            return cls._build_impl(validated)
        except Exception as exc:
            if isinstance(exc, AuditBuilderError):
                raise
            raise AuditBuilderError(str(exc)) from exc

    @classmethod
    def _build_impl(cls, validated: ValidatedAuditRequest) -> ClinicalAudit:
        context = get_context_manager().get()

        correlation_id = (
            validated.correlation_id
            or context.correlation_id
            or str(uuid.uuid4())
        )
        request_id = context.request_id
        user_id = validated.user_id or context.user_id
        user_role = validated.user_role or context.user_role
        patient_account_id = (
            validated.patient_account_id or context.patient_account_id
        )
        patient_profile_id = (
            validated.patient_profile_id or context.patient_profile_id
        )
        consultation_id = validated.consultation_id or context.consultation_id
        encounter_id = validated.encounter_id or context.encounter_id

        new_value = build_new_value_envelope(
            organization_id=validated.organization_id,
            payload=validated.payload,
            request_id=request_id,
            occurred_at=validated.occurred_at,
            service_name=validated.service_name,
        )

        return ClinicalAudit(
            correlation_id=correlation_id,
            user_id=user_id,
            user_role=user_role,
            patient_account_id=patient_account_id,
            patient_profile_id=patient_profile_id,
            consultation_id=consultation_id,
            encounter_id=encounter_id,
            module=validated.module,
            event=validated.event,
            action=validated.action,
            outcome=validated.outcome,
            resource_type=validated.resource_type,
            resource_id=validated.resource_id,
            previous_value=validated.snapshot,
            new_value=new_value,
            source=validated.source,
            ip_address=validated.ip_address,
            device_information=validated.device_information,
            remarks=validated.remarks,
        )

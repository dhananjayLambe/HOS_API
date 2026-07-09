"""Input validation for Clinical Audit record creation."""

from __future__ import annotations

from django.core.exceptions import ValidationError as DjangoValidationError

from clinical_audit.constants import MAX_PAYLOAD_BYTES, MAX_SNAPSHOT_BYTES
from clinical_audit.domain.types import ValidatedAuditRequest
from clinical_audit.domain.utils import (
    derive_module_from_action,
    is_valid_uuid,
    normalize_enum_value,
    validate_optional_json_dict,
    validate_remarks,
    validate_summary_length,
)
from clinical_audit.enums import AuditAction, AuditOutcome, AuditSource, ClinicalEntity
from clinical_audit.exceptions import AuditSerializationError, AuditValidationError


class AuditRequestValidator:
    """Validates audit record input before building and persistence."""

    @classmethod
    def validate(
        cls,
        *,
        action: AuditAction | str,
        event: str,
        resource_type: ClinicalEntity | str,
        resource_id: str,
        source: AuditSource | str,
        user_id: str,
        organization_id: str,
        module: str | None = None,
        patient_account_id: str | None = None,
        patient_profile_id: str | None = None,
        consultation_id: str | None = None,
        encounter_id: str | None = None,
        user_role: str | None = None,
        payload: dict[str, Any] | None = None,
        snapshot: dict[str, Any] | None = None,
        correlation_id: str | None = None,
        occurred_at: Any = None,
        outcome: AuditOutcome | str = AuditOutcome.SUCCESS,
        ip_address: str | None = None,
        device_information: str | None = None,
        remarks: str | None = None,
        service_name: str | None = None,
        validate_references: bool = True,
    ) -> ValidatedAuditRequest:
        try:
            return cls._validate_impl(
                action=action,
                event=event,
                resource_type=resource_type,
                resource_id=resource_id,
                source=source,
                user_id=user_id,
                organization_id=organization_id,
                module=module,
                patient_account_id=patient_account_id,
                patient_profile_id=patient_profile_id,
                consultation_id=consultation_id,
                encounter_id=encounter_id,
                user_role=user_role,
                payload=payload,
                snapshot=snapshot,
                correlation_id=correlation_id,
                occurred_at=occurred_at,
                outcome=outcome,
                ip_address=ip_address,
                device_information=device_information,
                remarks=remarks,
                service_name=service_name,
                validate_references=validate_references,
            )
        except (ValueError, TypeError, AuditSerializationError) as exc:
            raise AuditValidationError(str(exc)) from exc

    @classmethod
    def _validate_impl(
        cls,
        *,
        action: AuditAction | str,
        event: str,
        resource_type: ClinicalEntity | str,
        resource_id: str,
        source: AuditSource | str,
        user_id: str,
        organization_id: str,
        module: str | None,
        patient_account_id: str | None,
        patient_profile_id: str | None,
        consultation_id: str | None,
        encounter_id: str | None,
        user_role: str | None,
        payload: dict[str, Any] | None,
        snapshot: dict[str, Any] | None,
        correlation_id: str | None,
        occurred_at: Any,
        outcome: AuditOutcome | str,
        ip_address: str | None,
        device_information: str | None,
        remarks: str | None,
        service_name: str | None,
        validate_references: bool,
    ) -> ValidatedAuditRequest:
        if action is None:
            raise ValueError("action is required.")
        if resource_type is None:
            raise ValueError("resource_type is required.")
        if resource_id is None or not str(resource_id).strip():
            raise ValueError("resource_id is required.")
        if source is None:
            raise ValueError("source is required.")
        if user_id is None or not str(user_id).strip():
            raise ValueError("user_id is required.")
        if organization_id is None or not str(organization_id).strip():
            raise ValueError("organization_id is required.")

        action_value = normalize_enum_value(action, AuditAction)
        source_value = normalize_enum_value(source, AuditSource)
        resource_type_value = normalize_enum_value(resource_type, ClinicalEntity)
        outcome_value = normalize_enum_value(outcome, AuditOutcome)

        event_value = validate_summary_length(str(event))
        resource_id_value = str(resource_id).strip()
        user_id_value = str(user_id).strip()
        organization_id_value = str(organization_id).strip()

        module_value = (module or derive_module_from_action(action_value)).strip()
        if not module_value:
            raise ValueError("module is required.")

        if correlation_id is not None:
            correlation_id_value = str(correlation_id).strip()
            if not correlation_id_value:
                raise ValueError("correlation_id cannot be empty.")
            if not is_valid_uuid(correlation_id_value):
                raise ValueError("correlation_id must be a valid UUID.")
        else:
            correlation_id_value = None

        if not is_valid_uuid(organization_id_value):
            raise ValueError("organization_id must be a valid UUID.")

        payload_value = validate_optional_json_dict(
            payload, field_name="payload", max_bytes=MAX_PAYLOAD_BYTES
        )
        snapshot_value = validate_optional_json_dict(
            snapshot, field_name="snapshot", max_bytes=MAX_SNAPSHOT_BYTES
        )

        if validate_references:
            cls._validate_reference_existence(
                organization_id=organization_id_value,
                patient_account_id=patient_account_id,
                patient_profile_id=patient_profile_id,
                consultation_id=consultation_id,
                encounter_id=encounter_id,
            )

        return ValidatedAuditRequest(
            action=AuditAction(action_value),
            event=event_value,
            module=module_value[:64],
            resource_type=ClinicalEntity(resource_type_value),
            resource_id=resource_id_value[:64],
            source=AuditSource(source_value),
            user_id=user_id_value[:64],
            organization_id=organization_id_value,
            patient_account_id=cls._optional_id(patient_account_id),
            patient_profile_id=cls._optional_id(patient_profile_id),
            consultation_id=cls._optional_id(consultation_id),
            encounter_id=cls._optional_id(encounter_id),
            user_role=cls._optional_id(user_role),
            payload=payload_value,
            snapshot=snapshot_value,
            correlation_id=correlation_id_value,
            occurred_at=occurred_at,
            outcome=AuditOutcome(outcome_value),
            ip_address=ip_address,
            device_information=device_information,
            remarks=validate_remarks(remarks),
            service_name=cls._optional_id(service_name),
        )

    @staticmethod
    def _optional_id(value: str | None) -> str | None:
        if value is None:
            return None
        normalized = str(value).strip()
        return normalized or None

    @classmethod
    def _validate_reference_existence(
        cls,
        *,
        organization_id: str,
        patient_account_id: str | None,
        patient_profile_id: str | None,
        consultation_id: str | None,
        encounter_id: str | None,
    ) -> None:
        from clinic.models import Clinic

        if not Clinic.objects.filter(pk=organization_id).exists():
            raise ValueError(f"organization_id not found: {organization_id}")

        if patient_account_id:
            from patient_account.models import PatientAccount

            if not cls._model_exists(PatientAccount, patient_account_id):
                raise ValueError(
                    f"patient_account_id not found: {patient_account_id}"
                )

        if patient_profile_id:
            from patient_account.models import PatientProfile

            if not cls._model_exists(PatientProfile, patient_profile_id):
                raise ValueError(
                    f"patient_profile_id not found: {patient_profile_id}"
                )

        if consultation_id:
            from consultations_core.models.consultation import Consultation

            if not cls._model_exists(Consultation, consultation_id):
                raise ValueError(f"consultation_id not found: {consultation_id}")

        if encounter_id:
            from consultations_core.models.encounter import ClinicalEncounter

            if not cls._model_exists(ClinicalEncounter, encounter_id):
                raise ValueError(f"encounter_id not found: {encounter_id}")

    @staticmethod
    def _model_exists(model: type, pk: str) -> bool:
        try:
            return model.objects.filter(pk=pk).exists()
        except (DjangoValidationError, ValueError, TypeError):
            raise ValueError(f"invalid id format: {pk}") from None

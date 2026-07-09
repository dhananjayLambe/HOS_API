"""Public API for recording immutable clinical audit events."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime
from typing import Any

from clinical_audit.domain.builders import ClinicalAuditBuilder
from clinical_audit.domain.repository import ClinicalAuditRepository
from clinical_audit.domain.types import AuditRecordResult
from clinical_audit.domain.validators import AuditRequestValidator
from clinical_audit.enums import AuditAction, AuditOutcome, AuditSource, ClinicalEntity
from clinical_audit.exceptions import ClinicalAuditError

logger = logging.getLogger(__name__)


class ClinicalAuditService:
    """Centralized, fail-open service for creating clinical audit records."""

    _validator = AuditRequestValidator
    _builder = ClinicalAuditBuilder
    _repository = ClinicalAuditRepository()

    @classmethod
    def record(
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
        occurred_at: datetime | None = None,
        outcome: AuditOutcome = AuditOutcome.SUCCESS,
        ip_address: str | None = None,
        device_information: str | None = None,
        remarks: str | None = None,
        service_name: str | None = None,
        validate_references: bool = True,
        raise_on_failure: bool = False,
    ) -> AuditRecordResult:
        correlation_for_log = correlation_id or ""
        try:
            validated = cls._validator.validate(
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
            correlation_for_log = validated.correlation_id or correlation_for_log
            record = cls._builder.build(validated)
            correlation_for_log = record.correlation_id
            saved = cls._repository.save(record)
            return AuditRecordResult(
                success=True,
                audit_id=saved.id,
                correlation_id=saved.correlation_id,
            )
        except ClinicalAuditError as exc:
            logger.warning(
                "clinical_audit_record_failed",
                extra={
                    "correlation_id": correlation_for_log or str(uuid.uuid4()),
                    "error_type": type(exc).__name__,
                    "error": str(exc),
                    "action": str(action),
                    "resource_type": str(resource_type),
                    "resource_id": str(resource_id),
                },
                exc_info=True,
            )
            if raise_on_failure:
                raise
            return AuditRecordResult(
                success=False,
                correlation_id=correlation_for_log or str(uuid.uuid4()),
                error=str(exc),
                error_type=type(exc).__name__,
            )

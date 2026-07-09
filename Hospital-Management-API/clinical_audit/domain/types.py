"""Data transfer objects for the Clinical Audit service layer."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any
from uuid import UUID

from clinical_audit.enums import AuditAction, AuditOutcome, AuditSource, ClinicalEntity


@dataclass(frozen=True)
class ValidatedAuditRequest:
    """Normalized, validated input for audit record construction."""

    action: AuditAction
    event: str
    module: str
    resource_type: ClinicalEntity
    resource_id: str
    source: AuditSource
    user_id: str
    organization_id: str
    patient_account_id: str | None = None
    patient_profile_id: str | None = None
    consultation_id: str | None = None
    encounter_id: str | None = None
    user_role: str | None = None
    payload: dict[str, Any] | None = None
    snapshot: dict[str, Any] | None = None
    correlation_id: str | None = None
    occurred_at: datetime | None = None
    outcome: AuditOutcome = AuditOutcome.SUCCESS
    ip_address: str | None = None
    device_information: str | None = None
    remarks: str | None = None
    service_name: str | None = None


@dataclass(frozen=True)
class AuditRecordResult:
    """Structured outcome from ClinicalAuditService.record()."""

    success: bool
    correlation_id: str
    audit_id: UUID | None = None
    error: str | None = None
    error_type: str | None = None

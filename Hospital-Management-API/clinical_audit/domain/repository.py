"""Append-only persistence for Clinical Audit records."""

from __future__ import annotations

from uuid import UUID

from django.db import DatabaseError, IntegrityError

from clinical_audit.exceptions import AuditRepositoryError
from clinical_audit.models import ClinicalAudit


class ClinicalAuditRepository:
    """Database access for clinical audit records."""

    def save(self, record: ClinicalAudit) -> ClinicalAudit:
        try:
            record.save()
        except (DatabaseError, IntegrityError) as exc:
            raise AuditRepositoryError(str(exc)) from exc
        return record

    def bulk_save(self, records: list[ClinicalAudit]) -> list[ClinicalAudit]:
        if not records:
            return []
        try:
            return ClinicalAudit.objects.bulk_create(records)
        except (DatabaseError, IntegrityError) as exc:
            raise AuditRepositoryError(str(exc)) from exc

    def get_by_event_id(self, event_id: UUID | str) -> ClinicalAudit | None:
        try:
            return ClinicalAudit.objects.get(pk=event_id)
        except ClinicalAudit.DoesNotExist:
            return None

    def get_by_correlation_id(self, correlation_id: str) -> list[ClinicalAudit]:
        return list(
            ClinicalAudit.objects.filter(correlation_id=correlation_id).order_by(
                "timestamp"
            )
        )

    def filter_by_resource(
        self,
        resource_type: str,
        resource_id: str,
    ) -> list[ClinicalAudit]:
        return list(
            ClinicalAudit.objects.filter(
                resource_type=resource_type,
                resource_id=resource_id,
            ).order_by("-timestamp")
        )

    def filter_by_patient(self, patient_account_id: str) -> list[ClinicalAudit]:
        return list(
            ClinicalAudit.objects.filter(
                patient_account_id=patient_account_id,
            ).order_by("-timestamp")
        )

    def filter_by_consultation(self, consultation_id: str) -> list[ClinicalAudit]:
        return list(
            ClinicalAudit.objects.filter(
                consultation_id=consultation_id,
            ).order_by("timestamp")
        )

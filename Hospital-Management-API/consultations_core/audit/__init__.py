"""Consultation module audit integration."""

from consultations_core.audit.commit import emit_after_commit
from consultations_core.audit.consultation_audit_service import ConsultationAuditService
from consultations_core.audit.prescription import (
    PrescriptionAuditService,
    schedule_prescription_created,
    schedule_prescription_downloaded,
    schedule_prescription_signed,
    schedule_recommendation_generated,
)

__all__ = [
    "ConsultationAuditService",
    "PrescriptionAuditService",
    "emit_after_commit",
    "schedule_prescription_created",
    "schedule_prescription_signed",
    "schedule_prescription_downloaded",
    "schedule_recommendation_generated",
]

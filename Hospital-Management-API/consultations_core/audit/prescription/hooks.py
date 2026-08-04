"""Prescription audit integration hooks."""

from __future__ import annotations

from shared.logging import LogModule, logger

from consultations_core.audit.commit import emit_after_commit
from consultations_core.audit.prescription.prescription_audit_service import (
    PrescriptionAuditService,
)


def schedule_prescription_created(*, consultation, user, prescription) -> None:
    try:
        encounter = consultation.encounter
        emit_after_commit(
            PrescriptionAuditService.emit_prescription_created,
            encounter,
            consultation,
            user,
            prescription=prescription,
        )
    except Exception:
        logger.exception(
            "prescription_audit_created_schedule_failed",
            module=LogModule.PRESCRIPTION,
            action="prescription.audit.created.schedule_failed",
            metadata={"prescription_id": str(getattr(prescription, "id", ""))},
        )


def schedule_prescription_signed(*, consultation, user, prescription) -> None:
    try:
        encounter = consultation.encounter
        emit_after_commit(
            PrescriptionAuditService.emit_prescription_signed,
            encounter,
            consultation,
            user,
            prescription=prescription,
        )
    except Exception:
        logger.exception(
            "prescription_audit_signed_schedule_failed",
            module=LogModule.PRESCRIPTION,
            action="prescription.audit.signed.schedule_failed",
            metadata={"prescription_id": str(getattr(prescription, "id", ""))},
        )


def schedule_prescription_downloaded(*, prescription, request) -> None:
    try:
        consultation = prescription.consultation
        encounter = consultation.encounter
        downloaded_by = PrescriptionAuditService.resolve_downloaded_by(request)
        source = PrescriptionAuditService.resolve_download_source(request)
        user = getattr(request, "user", None)
        PrescriptionAuditService.emit_prescription_downloaded(
            encounter,
            consultation,
            user,
            prescription=prescription,
            downloaded_by=downloaded_by,
            source=source,
        )
    except Exception:
        logger.exception(
            "prescription_audit_downloaded_failed",
            module=LogModule.PRESCRIPTION,
            action="prescription.audit.downloaded.failed",
            metadata={"prescription_id": str(getattr(prescription, "id", ""))},
        )


def schedule_recommendation_generated(
    *,
    consultation,
    user,
    recommendation_id,
    result=None,
) -> None:
    try:
        encounter = consultation.encounter
        emit_after_commit(
            PrescriptionAuditService.emit_recommendation_generated,
            encounter,
            consultation,
            user,
            recommendation_id=recommendation_id,
            result=result,
        )
    except Exception:
        logger.exception(
            "recommendation_audit_generated_schedule_failed",
            module=LogModule.PRESCRIPTION,
            action="prescription.audit.recommendation.schedule_failed",
            metadata={"recommendation_id": str(recommendation_id)},
        )

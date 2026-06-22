"""Background orchestration for prescription WhatsApp prepare + send."""

from __future__ import annotations

import logging

from django.contrib.auth import get_user_model

from consultations_core.models.consultation import Consultation
from consultations_core.models.prescription import Prescription, PrescriptionStatus
from consultations_core.services.prescription_pdf_service import generate_and_persist_prescription_pdf
from notifications.models.whatsapp_notifications import WhatsAppMessageStatus
from notifications.services.delivery.whatsapp_service import WhatsAppService

logger = logging.getLogger(__name__)
User = get_user_model()


def _consultation_queryset():
    return (
        Consultation.objects.select_related(
            "encounter",
            "encounter__patient_profile",
            "encounter__patient_account",
            "encounter__patient_account__user",
            "encounter__clinic",
            "encounter__doctor",
        )
        .prefetch_related(
            "prescriptions__lines",
            "investigations__items",
        )
    )


def run_prepare_consultation_and_enqueue(
    *,
    consultation_id: str,
    initiated_by_id: str | None = None,
    base_url: str = "/",
) -> str | None:
    """
    Prepare WhatsApp for a completed consultation (with or without prescription).

    Returns message_id when send should be chained, else None.
    """
    try:
        consultation = _consultation_queryset().filter(pk=consultation_id).first()
        if consultation is None:
            logger.warning("consultation_whatsapp_prepare_missing consultation_id=%s", consultation_id)
            return None

        prescription = (
            Prescription.objects.filter(
                consultation_id=consultation_id,
                is_active=True,
                status=PrescriptionStatus.FINALIZED,
            )
            .order_by("-finalized_at")
            .first()
        )

        initiated_by = None
        if initiated_by_id:
            initiated_by = User.objects.filter(pk=initiated_by_id).first()

        if prescription is not None:
            generate_and_persist_prescription_pdf(prescription=prescription, base_url=base_url)
            prescription.refresh_from_db()

        message = WhatsAppService().prepare_consultation_delivery(
            consultation=consultation,
            prescription=prescription,
            initiated_by=initiated_by,
            base_url=base_url,
        )
        if message.status == WhatsAppMessageStatus.QUEUED:
            return str(message.id)
        return None
    except Exception:
        logger.exception(
            "consultation_whatsapp_prepare_failed consultation_id=%s",
            consultation_id,
        )
        return None


def run_prepare_and_enqueue(
    *,
    prescription_id: str,
    initiated_by_id: str | None = None,
    base_url: str = "/",
) -> str | None:
    """Backward-compatible entry when only prescription_id is known."""
    prescription = (
        Prescription.objects.filter(
            pk=prescription_id,
            is_active=True,
            status=PrescriptionStatus.FINALIZED,
        )
        .values_list("consultation_id", flat=True)
        .first()
    )
    if prescription is None:
        logger.warning("prescription_whatsapp_prepare_missing prescription_id=%s", prescription_id)
        return None
    return run_prepare_consultation_and_enqueue(
        consultation_id=str(prescription),
        initiated_by_id=initiated_by_id,
        base_url=base_url,
    )

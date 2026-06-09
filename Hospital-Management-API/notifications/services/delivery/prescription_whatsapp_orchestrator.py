"""Background orchestration for prescription WhatsApp prepare + send."""

from __future__ import annotations

import logging

from django.contrib.auth import get_user_model

from consultations_core.models.prescription import Prescription, PrescriptionStatus
from consultations_core.services.prescription_pdf_service import generate_and_persist_prescription_pdf
from notifications.models.whatsapp_notifications import WhatsAppMessageStatus
from notifications.services.delivery.whatsapp_service import WhatsAppService

logger = logging.getLogger(__name__)
User = get_user_model()


def run_prepare_and_enqueue(
    *,
    prescription_id: str,
    initiated_by_id: str | None = None,
    base_url: str = "/",
) -> str | None:
    """
    Generate PDF, create WhatsAppMessage, and return message_id if QUEUED.

    Never raises — failures are recorded as SKIPPED/FAILED on WhatsAppMessage.
    Returns message_id when send should be chained, else None.
    """
    try:
        prescription = (
            Prescription.objects.select_related(
                "consultation",
                "consultation__encounter",
                "consultation__encounter__patient_profile",
                "consultation__encounter__patient_account",
                "consultation__encounter__patient_account__user",
                "consultation__encounter__clinic",
                "consultation__encounter__doctor",
            )
            .prefetch_related(
                "lines",
                "consultation__prescriptions",
                "consultation__investigations__items",
            )
            .filter(
                pk=prescription_id,
                is_active=True,
                status=PrescriptionStatus.FINALIZED,
            )
            .first()
        )
        if prescription is None:
            logger.warning("prescription_whatsapp_prepare_missing prescription_id=%s", prescription_id)
            return None

        initiated_by = None
        if initiated_by_id:
            initiated_by = User.objects.filter(pk=initiated_by_id).first()

        generate_and_persist_prescription_pdf(prescription=prescription, base_url=base_url)
        prescription.refresh_from_db()

        message = WhatsAppService().prepare_prescription_delivery(
            prescription=prescription,
            initiated_by=initiated_by,
            base_url=base_url,
        )
        if message.status == WhatsAppMessageStatus.QUEUED:
            return str(message.id)
        return None
    except Exception:
        logger.exception(
            "prescription_whatsapp_prepare_failed prescription_id=%s",
            prescription_id,
        )
        return None

"""Celery tasks for notification delivery."""

from __future__ import annotations

import logging

from celery import shared_task
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist

from notifications.models.whatsapp_notifications import WhatsAppMessageStatus
from notifications.services.delivery.diagnostic_recommendation_whatsapp_orchestrator import (
    run_prepare_and_enqueue as run_prepare_recommendation_and_enqueue,
)
from notifications.services.delivery.prescription_whatsapp_orchestrator import (
    run_prepare_and_enqueue,
    run_prepare_consultation_and_enqueue,
)
from notifications.services.delivery.whatsapp_service import WhatsAppService

logger = logging.getLogger(__name__)


def _enqueue_diagnostic_recommendation_if_enabled(message) -> None:
    if not getattr(settings, "WHATSAPP_DIAGNOSTIC_RECOMMENDATION_ENABLED", True):
        return
    if message.status != WhatsAppMessageStatus.SENT:
        return

    consultation_id = None
    if message.prescription_id and message.prescription is not None:
        consultation_id = message.prescription.consultation_id
    elif message.encounter_id:
        from consultations_core.models.consultation import Consultation

        consultation_id = (
            Consultation.objects.filter(encounter_id=message.encounter_id)
            .values_list("id", flat=True)
            .first()
        )
    if consultation_id is None:
        logger.warning(
            "recommendation_chain_skipped message_id=%s reason=no_consultation",
            message.id,
        )
        return

    prepare_diagnostic_recommendation_whatsapp.delay(
        str(consultation_id),
        str(message.id),
    )


@shared_task(bind=True, max_retries=2, default_retry_delay=15)
def prepare_consultation_whatsapp(
    self,
    consultation_id: str,
    initiated_by_id: str | None = None,
    base_url: str = "/",
) -> None:
    """Background prepare: consultation summary WhatsApp (medicines/tests may be empty)."""
    try:
        message_id = run_prepare_consultation_and_enqueue(
            consultation_id=consultation_id,
            initiated_by_id=initiated_by_id,
            base_url=base_url,
        )
        if message_id:
            send_prescription_whatsapp.delay(message_id)
    except Exception as exc:
        logger.exception("prepare_consultation_whatsapp_task_error consultation_id=%s", consultation_id)
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc) from exc


@shared_task(bind=True, max_retries=2, default_retry_delay=15)
def prepare_prescription_whatsapp(
    self,
    prescription_id: str,
    initiated_by_id: str | None = None,
    base_url: str = "/",
) -> None:
    """
    Background prepare: PDF persist, WhatsAppMessage create, chain send if QUEUED.
    """
    try:
        message_id = run_prepare_and_enqueue(
            prescription_id=prescription_id,
            initiated_by_id=initiated_by_id,
            base_url=base_url,
        )
        if message_id:
            send_prescription_whatsapp.delay(message_id)
    except Exception as exc:
        logger.exception("prepare_prescription_whatsapp_task_error prescription_id=%s", prescription_id)
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc) from exc


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_prescription_whatsapp(self, message_id: str) -> None:
    """Send a prepared prescription WhatsApp message using stored payload snapshot."""
    try:
        message = WhatsAppService().send_prescription_message(message_id=message_id)
    except ObjectDoesNotExist:
        logger.warning("prescription_whatsapp_task_missing message_id=%s", message_id)
        return
    except Exception as exc:
        logger.exception("prescription_whatsapp_task_error message_id=%s", message_id)
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc) from exc
        return

    if message.status == WhatsAppMessageStatus.FAILED:
        logger.warning(
            "prescription_whatsapp_task_failed message_id=%s reason=%s",
            message_id,
            message.failure_reason,
        )
        return

    try:
        _enqueue_diagnostic_recommendation_if_enabled(message)
    except Exception:
        logger.exception(
            "diagnostic_recommendation_chain_failed prescription_message_id=%s",
            message_id,
        )


@shared_task(bind=True, max_retries=2, default_retry_delay=15)
def prepare_diagnostic_recommendation_whatsapp(
    self,
    consultation_id: str,
    prescription_message_id: str | None = None,
) -> None:
    """Prepare diagnostic recommendation WhatsApp after prescription delivery."""
    try:
        message_id = run_prepare_recommendation_and_enqueue(
            consultation_id=consultation_id,
            prescription_message_id=prescription_message_id,
        )
        if message_id:
            send_diagnostic_recommendation_whatsapp.delay(message_id)
    except Exception as exc:
        logger.exception(
            "prepare_diagnostic_recommendation_whatsapp_task_error consultation_id=%s",
            consultation_id,
        )
        logger.info(
            "recommendation.retry consultation_id=%s prescription_message_id=%s",
            consultation_id,
            prescription_message_id,
        )
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc) from exc


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_diagnostic_recommendation_whatsapp(self, message_id: str) -> None:
    """Send a prepared diagnostic recommendation WhatsApp message."""
    try:
        message = WhatsAppService().send_recommendation_message(message_id=message_id)
    except ObjectDoesNotExist:
        logger.warning("diagnostic_recommendation_whatsapp_task_missing message_id=%s", message_id)
        return
    except Exception as exc:
        logger.exception("diagnostic_recommendation_whatsapp_task_error message_id=%s", message_id)
        logger.info("recommendation.retry whatsapp_message_id=%s", message_id)
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc) from exc
        return

    if message.status == WhatsAppMessageStatus.FAILED:
        logger.warning(
            "diagnostic_recommendation_whatsapp_task_failed message_id=%s reason=%s",
            message_id,
            message.failure_reason,
        )

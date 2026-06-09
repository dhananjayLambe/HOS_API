"""Celery tasks for notification delivery."""

from __future__ import annotations

import logging

from celery import shared_task
from django.core.exceptions import ObjectDoesNotExist

from notifications.models.whatsapp_notifications import WhatsAppMessageStatus
from notifications.services.delivery.prescription_whatsapp_orchestrator import run_prepare_and_enqueue
from notifications.services.delivery.whatsapp_service import WhatsAppService

logger = logging.getLogger(__name__)


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

"""Celery tasks for notification delivery."""

from __future__ import annotations

import logging

from celery import shared_task
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist

from business_audit.domain.context import apply_workflow_context
from business_audit.recommendation.hooks import schedule_recommendation_business_retried
from business_audit.recommendation.recommendation_audit_service import (
    RecommendationAuditService,
)
from notifications.models.whatsapp_notifications import WhatsAppMessage, WhatsAppMessageStatus
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


def _schedule_send_retry_audit(message_id: str, *, retry_count: int, retry_reason: str) -> None:
    try:
        message = WhatsAppMessage.objects.select_related(
            "prescription",
            "prescription__consultation",
            "prescription__consultation__encounter",
            "encounter",
        ).filter(pk=message_id, is_deleted=False).first()
        if message is None:
            return
        payload = message.request_payload or {}
        recommendation_id = (payload.get("recommendation_id") or "").strip()
        if recommendation_id:
            apply_workflow_context(workflow_instance_id=recommendation_id)
        consultation = RecommendationAuditService.resolve_consultation_from_message(message)
        if consultation is None or not recommendation_id:
            return
        schedule_recommendation_business_retried(
            consultation=consultation,
            recommendation_id=recommendation_id,
            whatsapp_message=message,
            retry_count=retry_count,
            retry_reason=retry_reason,
            prior_status=str(message.status),
            prior_retry_count=max(retry_count - 1, 0),
            max_retry=3,
        )
    except Exception:
        logger.warning(
            "recommendation_business_retried_schedule_failed",
            exc_info=True,
            extra={"message_id": message_id},
        )


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
        _schedule_send_retry_audit(
            message_id,
            retry_count=self.request.retries + 1,
            retry_reason=str(exc),
        )
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc) from exc
        return

    if message.status == WhatsAppMessageStatus.FAILED:
        logger.warning(
            "diagnostic_recommendation_whatsapp_task_failed message_id=%s reason=%s",
            message_id,
            message.failure_reason,
        )


@shared_task
def expire_stale_recommendations() -> int:
    """Emit recommendation.expired for TEST_BOOKING messages past TTL."""
    from datetime import datetime, timezone

    from business_audit.recommendation.hooks import schedule_recommendation_business_expired
    from notifications.models.whatsapp_notifications import WhatsAppMessageType

    now = datetime.now(timezone.utc)
    expired_count = 0
    terminal_statuses = {
        WhatsAppMessageStatus.DELIVERED,
        WhatsAppMessageStatus.READ,
        WhatsAppMessageStatus.FAILED,
    }
    messages = WhatsAppMessage.objects.filter(
        message_type=WhatsAppMessageType.TEST_BOOKING,
        is_deleted=False,
    ).exclude(status__in=terminal_statuses)

    for message in messages.iterator():
        payload = message.request_payload or {}
        metadata = payload.get("recommendation_metadata") or {}
        expires_at_raw = metadata.get("expires_at") or payload.get("expires_at")
        recommendation_id = (payload.get("recommendation_id") or "").strip()
        if not expires_at_raw or not recommendation_id:
            continue

        from django.utils.dateparse import parse_datetime

        expires_at = parse_datetime(str(expires_at_raw))
        if expires_at is None:
            continue
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at > now:
            continue

        consultation = RecommendationAuditService.resolve_consultation_from_message(message)
        if consultation is None:
            continue

        schedule_recommendation_business_expired(
            consultation=consultation,
            recommendation_id=recommendation_id,
            expires_at=str(expires_at_raw),
            whatsapp_message=message,
            message_status=str(message.status),
        )
        expired_count += 1
        logger.info(
            "recommendation.expired recommendation_id=%s consultation_id=%s message_id=%s",
            recommendation_id,
            payload.get("consultation_id"),
            message.id,
        )

    return expired_count

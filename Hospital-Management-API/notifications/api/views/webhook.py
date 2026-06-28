"""Meta WhatsApp webhook handlers."""

from __future__ import annotations

import json
import logging

from django.conf import settings
from django.http import HttpResponse
from django.utils.dateparse import parse_datetime
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from notifications.models.whatsapp_notifications import WhatsAppMessage, WhatsAppMessageStatus
from notifications.services.audit.prescription_whatsapp_audit import (
    emit_prescription_whatsapp_audit_event,
    safe_emit,
)

logger = logging.getLogger(__name__)

_META_STATUS_MAP = {
    "sent": WhatsAppMessageStatus.SENT,
    "delivered": WhatsAppMessageStatus.DELIVERED,
    "read": WhatsAppMessageStatus.READ,
    "failed": WhatsAppMessageStatus.FAILED,
}


class WhatsAppWebhookAPIView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        mode = request.query_params.get("hub.mode")
        token = request.query_params.get("hub.verify_token")
        challenge = request.query_params.get("hub.challenge", "")
        verify_token = getattr(settings, "WHATSAPP_WEBHOOK_VERIFY_TOKEN", "")
        if mode == "subscribe" and token == verify_token:
            return HttpResponse(challenge, content_type="text/plain", status=200)
        return HttpResponse("Forbidden", status=403)

    def post(self, request):
        try:
            payload = request.data if isinstance(request.data, dict) else json.loads(request.body or "{}")
        except (TypeError, ValueError, json.JSONDecodeError):
            payload = {}

        for entry in payload.get("entry", []) or []:
            for change in entry.get("changes", []) or []:
                value = change.get("value", {}) or {}
                for status_item in value.get("statuses", []) or []:
                    self._process_status(status_item, payload)

        return HttpResponse("OK", status=200)

    def _process_status(self, status_item: dict, raw_payload: dict) -> None:
        meta_message_id = (status_item.get("id") or "").strip()
        if not meta_message_id:
            return

        message = WhatsAppMessage.objects.filter(meta_message_id=meta_message_id, is_deleted=False).first()
        if message is None:
            logger.info("whatsapp_webhook_unknown_message meta_message_id=%s", meta_message_id)
            return

        provider_status = (status_item.get("status") or "").strip().lower()
        mapped = _META_STATUS_MAP.get(provider_status)
        if mapped is None:
            return

        timestamp_raw = status_item.get("timestamp")
        at = None
        if timestamp_raw:
            try:
                from datetime import datetime, timezone as dt_timezone

                at = datetime.fromtimestamp(int(timestamp_raw), tz=dt_timezone.utc)
            except (TypeError, ValueError):
                at = parse_datetime(str(timestamp_raw))

        message.webhook_payload = raw_payload
        if mapped == WhatsAppMessageStatus.FAILED:
            errors = status_item.get("errors") or []
            if errors:
                message.error_code = str(errors[0].get("code", ""))[:100]
                message.failure_reason = str(errors[0].get("title") or errors[0].get("message") or "Delivery failed")
            message.status = mapped
            message.save(update_fields=["status", "error_code", "failure_reason", "webhook_payload", "updated_at"])
            safe_emit(
                emit_prescription_whatsapp_audit_event,
                action="PRESCRIPTION_WHATSAPP_FAILED",
                message=message,
                metadata={"provider_status": provider_status},
            )
            return

        message.mark_status(mapped, at=at)
        message.webhook_payload = raw_payload
        message.save(update_fields=["webhook_payload", "updated_at"])

        if message.message_type == "TEST_BOOKING" and mapped == WhatsAppMessageStatus.DELIVERED:
            payload = message.request_payload or {}
            logger.info(
                "recommendation.delivered consultation_id=%s recommendation_id=%s "
                "whatsapp_message_id=%s template_name=%s",
                payload.get("consultation_id"),
                payload.get("recommendation_id"),
                message.id,
                message.template_name,
            )

        audit_action = {
            WhatsAppMessageStatus.SENT: "PRESCRIPTION_WHATSAPP_SENT",
            WhatsAppMessageStatus.DELIVERED: "PRESCRIPTION_WHATSAPP_DELIVERED",
            WhatsAppMessageStatus.READ: "PRESCRIPTION_WHATSAPP_READ",
        }.get(mapped)
        if message.message_type == "TEST_BOOKING":
            audit_action = {
                WhatsAppMessageStatus.SENT: "DIAGNOSTIC_RECOMMENDATION_WHATSAPP_SENT",
                WhatsAppMessageStatus.DELIVERED: "DIAGNOSTIC_RECOMMENDATION_WHATSAPP_DELIVERED",
                WhatsAppMessageStatus.READ: "DIAGNOSTIC_RECOMMENDATION_WHATSAPP_READ",
            }.get(mapped, audit_action)
        if audit_action:
            safe_emit(
                emit_prescription_whatsapp_audit_event,
                action=audit_action,
                message=message,
                metadata={"provider_status": provider_status},
            )

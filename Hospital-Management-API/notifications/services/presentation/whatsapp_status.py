"""Presentation helpers for prescription WhatsApp delivery status."""

from __future__ import annotations

from notifications.models.whatsapp_notifications import WhatsAppMessage, WhatsAppMessageStatus
from notifications.services.delivery.phone_utils import try_normalize_delivery_phone


_SUCCESS_STATUSES = {
    WhatsAppMessageStatus.SENT,
    WhatsAppMessageStatus.DELIVERED,
    WhatsAppMessageStatus.READ,
}

_RESENDABLE_SKIP_REASONS = frozenset(
    {
        "No mobile number",
        "Invalid mobile number",
        "PDF not available",
    }
)


def get_latest_prescription_whatsapp_message(prescription_id) -> WhatsAppMessage | None:
    return (
        WhatsAppMessage.objects.filter(
            prescription_id=prescription_id,
            is_deleted=False,
        )
        .order_by("-created_at")
        .first()
    )


def get_prescription_whatsapp_status(prescription_id) -> dict | None:
    message = get_latest_prescription_whatsapp_message(prescription_id)
    if message is None:
        return None
    return serialize_whatsapp_message(message)


def _response_has_meta_error(message: WhatsAppMessage) -> bool:
    payload = message.response_payload or {}
    if isinstance(payload, dict) and payload.get("error"):
        return True
    return bool((message.error_code or "").strip() or (message.failure_reason or "").strip())


def effective_whatsapp_status(message: WhatsAppMessage) -> str:
    """
    Some legacy rows were marked SENT without meta_message_id after a failed Meta call.
    Treat those as FAILED so the UI and retry API stay consistent.
    """
    status = message.status or ""
    if status in _SUCCESS_STATUSES and not (message.meta_message_id or "").strip():
        if _response_has_meta_error(message):
            return WhatsAppMessageStatus.FAILED
    return status


def can_retry_whatsapp_message(message: WhatsAppMessage) -> bool:
    return effective_whatsapp_status(message) == WhatsAppMessageStatus.FAILED


def can_resend_whatsapp_message(message: WhatsAppMessage) -> bool:
    if message.status != WhatsAppMessageStatus.SKIPPED:
        return False
    reason = (message.failure_reason or "").strip()
    return reason in _RESENDABLE_SKIP_REASONS


def _display_recipient_mobile(message: WhatsAppMessage) -> str | None:
    stored = (getattr(message, "recipient_mobile_number", None) or "").strip()
    if not stored:
        return None
    return try_normalize_delivery_phone(stored) or stored


def _display_failure_reason(message: WhatsAppMessage) -> str | None:
    reason = (message.failure_reason or "").strip()
    if reason:
        return reason
    if effective_whatsapp_status(message) != WhatsAppMessageStatus.FAILED:
        return None
    payload = message.response_payload or {}
    error = payload.get("error") if isinstance(payload, dict) else None
    if isinstance(error, dict):
        return (error.get("message") or "").strip() or None
    return None


def serialize_whatsapp_message(message: WhatsAppMessage) -> dict:
    status = effective_whatsapp_status(message).lower()
    is_failed = status == WhatsAppMessageStatus.FAILED.lower()
    return {
        "message_id": str(message.id),
        "status": status,
        "sent_at": message.sent_at.isoformat() if message.sent_at and not is_failed else None,
        "delivered_at": message.delivered_at.isoformat() if message.delivered_at else None,
        "read_at": message.read_at.isoformat() if message.read_at else None,
        "failure_reason": _display_failure_reason(message),
        "recipient_mobile_number": _display_recipient_mobile(message),
        "can_retry": can_retry_whatsapp_message(message),
        "can_resend": can_resend_whatsapp_message(message),
    }


def prescription_ids_for_whatsapp_filter(whatsapp_status: str) -> set | None:
    """Return prescription IDs matching filter, or None if no filter."""
    normalized = (whatsapp_status or "").strip().lower()
    if not normalized or normalized == "all":
        return None

    qs = WhatsAppMessage.objects.filter(
        message_type="PRESCRIPTION",
        is_deleted=False,
        prescription_id__isnull=False,
    )
    if normalized == "delivered":
        qs = qs.filter(status__in=[WhatsAppMessageStatus.DELIVERED, WhatsAppMessageStatus.READ])
    elif normalized == "failed":
        qs = qs.filter(status=WhatsAppMessageStatus.FAILED)
    elif normalized == "skipped":
        qs = qs.filter(status=WhatsAppMessageStatus.SKIPPED)
    elif normalized == "pending":
        qs = qs.filter(status__in=[WhatsAppMessageStatus.QUEUED, WhatsAppMessageStatus.SENT])
    else:
        return None

    return set(qs.values_list("prescription_id", flat=True).distinct())

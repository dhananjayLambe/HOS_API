"""Read-only metrics for diagnostic recommendation WhatsApp (M4 ops dashboard)."""

from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from notifications.models.whatsapp_notifications import WhatsAppMessage, WhatsAppMessageStatus, WhatsAppMessageType

_SUCCESS_STATUSES = {
    WhatsAppMessageStatus.SENT,
    WhatsAppMessageStatus.DELIVERED,
    WhatsAppMessageStatus.READ,
}


def _recommendation_qs(*, since=None):
    qs = WhatsAppMessage.objects.filter(
        message_type=WhatsAppMessageType.TEST_BOOKING,
        is_deleted=False,
    )
    if since is not None:
        qs = qs.filter(created_at__gte=since)
    return qs


def get_recommendation_whatsapp_metrics(*, days: int = 7) -> dict:
    """Aggregate recommendation funnel counts for ops monitoring."""
    days = max(1, min(int(days or 7), 90))
    since = timezone.now() - timedelta(days=days)
    qs = _recommendation_qs(since=since)

    generated = qs.count()
    sent = qs.filter(status__in=_SUCCESS_STATUSES).count()
    failed = qs.filter(status=WhatsAppMessageStatus.FAILED).count()
    skipped = qs.filter(status=WhatsAppMessageStatus.SKIPPED).count()
    queued = qs.filter(status=WhatsAppMessageStatus.QUEUED).count()
    delivered = qs.filter(
        status__in={WhatsAppMessageStatus.DELIVERED, WhatsAppMessageStatus.READ}
    ).count()

    available = 0
    unavailable = 0
    for payload in qs.values_list("request_payload", flat=True):
        variant = (payload or {}).get("variant")
        if variant == "available":
            available += 1
        elif variant == "unavailable":
            unavailable += 1

    no_eligible_lab = unavailable

    return {
        "window_days": days,
        "since": since.isoformat(),
        "recommendations_generated": generated,
        "recommendations_available": available,
        "recommendations_unavailable": unavailable,
        "recommendations_sent": sent,
        "recommendations_delivered": delivered,
        "recommendations_failed": failed,
        "recommendations_skipped": skipped,
        "recommendations_queued": queued,
        "no_eligible_lab": no_eligible_lab,
        "button_clicks": None,
        "booking_conversions": None,
        "notes": {
            "button_clicks": "Milestone 5 — Flow button analytics not wired yet.",
            "booking_conversions": "Milestone 5 — DiagnosticOrder handoff not wired yet.",
        },
    }


def serialize_recommendation_message(message: WhatsAppMessage) -> dict:
    payload = message.request_payload or {}
    metadata = payload.get("recommendation_metadata") or {}
    return {
        "message_id": str(message.id),
        "message_type": message.message_type,
        "status": (message.status or "").lower(),
        "consultation_id": payload.get("consultation_id"),
        "encounter_id": str(message.encounter_id) if message.encounter_id else None,
        "meta_message_id": message.meta_message_id or None,
        "template_name": message.template_name or None,
        "recommendation_id": payload.get("recommendation_id") or metadata.get("recommendation_id"),
        "generated_at": metadata.get("generated_at"),
        "expires_at": metadata.get("expires_at"),
        "recommended_branch": metadata.get("recommended_branch"),
        "quoted_price": metadata.get("quoted_price") or payload.get("quoted_price"),
        "collection_mode": metadata.get("collection_mode") or payload.get("collection_mode"),
        "variant": payload.get("variant"),
        "pricing_display_mode": payload.get("pricing_display_mode"),
        "queued_at": message.queued_at.isoformat() if message.queued_at else None,
        "sent_at": message.sent_at.isoformat() if message.sent_at else None,
        "delivered_at": message.delivered_at.isoformat() if message.delivered_at else None,
        "failure_reason": message.failure_reason or None,
    }

"""Non-blocking audit hooks for prescription WhatsApp delivery."""

from __future__ import annotations

import json
import logging

from consultations_core.models.audit import AuditSource, ClinicalAuditLog

logger = logging.getLogger(__name__)

_AUDIT_SOURCE = AuditSource.SYSTEM


def safe_emit(fn, /, *args, **kwargs) -> None:
    try:
        fn(*args, **kwargs)
    except Exception:
        logger.warning(
            "prescription_whatsapp_safe_emit_failed fn=%s",
            getattr(fn, "__name__", repr(fn)),
            exc_info=True,
        )


def emit_prescription_whatsapp_audit_event(
    *,
    action: str,
    prescription=None,
    message=None,
    user=None,
    metadata: dict | None = None,
) -> None:
    payload = {"action": action}
    if message is not None:
        payload["message_id"] = str(message.pk)
        payload["status"] = message.status
    if metadata:
        payload.update(metadata)
    reason = json.dumps(payload, default=str)
    if len(reason) > 2000:
        reason = reason[:2000]

    object_type = "Prescription"
    object_id = prescription.pk if prescription is not None else None
    if object_id is None and message is not None and message.prescription_id:
        object_type = "Prescription"
        object_id = message.prescription_id
    if object_id is None and message is not None:
        object_type = "WhatsAppMessage"
        object_id = message.pk

    ClinicalAuditLog.objects.create(
        object_type=object_type,
        object_id=object_id,
        field_name="action",
        old_value=None,
        new_value=action[:255],
        changed_by=user,
        source=_AUDIT_SOURCE,
        reason=reason,
    )

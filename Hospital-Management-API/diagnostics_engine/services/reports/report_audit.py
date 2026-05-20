"""Non-blocking audit hooks for diagnostic report operational events."""

from __future__ import annotations

import json
import logging

from consultations_core.models.audit import AuditSource, ClinicalAuditLog

logger = logging.getLogger(__name__)

_AUDIT_SOURCE = AuditSource.SYSTEM


def _emit_report_audit_event_impl(
    *,
    action: str,
    report,
    user=None,
    metadata: dict | None = None,
) -> None:
    payload = {"action": action}
    if metadata:
        payload.update(metadata)
    reason = json.dumps(payload, default=str)
    if len(reason) > 2000:
        reason = reason[:2000]
    ClinicalAuditLog.objects.create(
        object_type=report.__class__.__name__,
        object_id=report.pk,
        field_name="action",
        old_value=None,
        new_value=action[:255],
        changed_by=user,
        source=_AUDIT_SOURCE,
        reason=reason,
    )


def emit_report_audit_event(
    *,
    action: str,
    report,
    user=None,
    metadata: dict | None = None,
) -> None:
    """
    Record a report operational action. Never raises — audit failure must not block clinical workflow.

    Uses ``field_name='action'`` rows; do not use ``AuditService.log_status_change`` for uploads.
    """
    from diagnostics_engine.monitoring.report_events import safe_emit

    safe_emit(
        _emit_report_audit_event_impl,
        action=action,
        report=report,
        user=user,
        metadata=metadata,
    )

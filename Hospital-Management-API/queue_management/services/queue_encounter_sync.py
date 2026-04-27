"""
Keep operational Queue rows aligned with ClinicalEncounter terminal transitions.

Helpdesk "today" filters by Queue.status, but the encounter is updated by the doctor
when consultation ends; without sync, a row can stay `vitals_done` while the encounter
is already `consultation_completed` (stale label on helpdesk).
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from django.utils import timezone

from queue_management.models import Queue

logger = logging.getLogger(__name__)

# Row states that should leave the helpdesk "active" lane when the encounter is done.
_STATES_TO_RECONCILE = ("waiting", "vitals_done", "in_consultation")


def mark_queue_rows_for_encounter_completed(encounter_id: Any) -> int:
    """
    Set linked queue row(s) to `completed` when the visit is clinically complete.
    Idempotent: safe to call multiple times.
    """
    eid = _as_uuid(encounter_id)
    if eid is None:
        return 0
    n = Queue.objects.filter(
        encounter_id=eid,
        status__in=_STATES_TO_RECONCILE,
    ).update(status="completed", updated_at=timezone.now())
    if n:
        logger.info("queue_encounter_sync.completed encounter_id=%s updated_rows=%s", eid, n)
    return n


def mark_queue_rows_for_encounter_cancelled(encounter_id: Any) -> int:
    """Set linked queue row(s) to `cancelled` when the encounter is cancelled."""
    eid = _as_uuid(encounter_id)
    if eid is None:
        return 0
    n = Queue.objects.filter(
        encounter_id=eid,
        status__in=_STATES_TO_RECONCILE,
    ).update(status="cancelled", updated_at=timezone.now())
    if n:
        logger.info("queue_encounter_sync.cancelled encounter_id=%s updated_rows=%s", eid, n)
    return n


def mark_queue_rows_for_encounter_no_show(encounter_id: Any) -> int:
    """Set linked queue row(s) to `skipped` for no-show (excluded from helpdesk active list)."""
    eid = _as_uuid(encounter_id)
    if eid is None:
        return 0
    n = Queue.objects.filter(
        encounter_id=eid,
        status__in=_STATES_TO_RECONCILE,
    ).update(status="skipped", updated_at=timezone.now())
    if n:
        logger.info("queue_encounter_sync.no_show encounter_id=%s updated_rows=%s", eid, n)
    return n


def _as_uuid(value: Any) -> uuid.UUID | None:
    if value is None:
        return None
    if isinstance(value, uuid.UUID):
        return value
    try:
        return uuid.UUID(str(value))
    except (ValueError, TypeError, AttributeError):
        return None

"""Single entry point for adding an encounter to the Smart Queue."""

import logging

from django.db import IntegrityError, transaction
from django.db.models import Max
from django.utils import timezone

from queue_management.models import Queue
from queue_management.services.queue_sync import _sync_queue_realtime

logger = logging.getLogger(__name__)

MAX_RETRIES = 3


class InvalidEncounterForQueueError(Exception):
    """Encounter missing doctor or clinic — cannot add to queue."""


def trigger_queue_realtime_update(queue):
    """Schedule Redis + channel sync after commit so readers see the new row."""

    doctor_id = queue.doctor_id
    clinic_id = queue.clinic_id
    queue_date = timezone.localdate()

    def _run():
        try:
            _sync_queue_realtime(
                doctor_id=doctor_id,
                clinic_id=clinic_id,
                queue_date=queue_date,
            )
        except Exception:
            logger.exception("Realtime sync failed")

    transaction.on_commit(_run)


def add_to_queue(encounter, user):
    """
    Create or return existing Queue row for this encounter.
    Caller should run inside transaction.atomic when queue + appointment must commit together.
    """
    _ = user  # reserved for audit / future created_by

    if not encounter.doctor_id or not encounter.clinic_id:
        raise InvalidEncounterForQueueError("Invalid encounter")

    if encounter.appointment_id:
        existing = getattr(encounter.appointment, "queue", None)
        if existing:
            return existing

    existing = Queue.objects.filter(encounter=encounter).first()
    if existing:
        return existing

    for attempt in range(MAX_RETRIES):
        try:
            queue_date = timezone.localdate()
            last_position = (
                Queue.objects.filter(
                    doctor_id=encounter.doctor_id,
                    clinic_id=encounter.clinic_id,
                    created_at__date=queue_date,
                    status__in=["waiting", "vitals_done"],
                ).aggregate(Max("position_in_queue"))
            )["position_in_queue__max"] or 0

            queue = Queue.objects.create(
                encounter=encounter,
                appointment=encounter.appointment,
                doctor=encounter.doctor,
                clinic=encounter.clinic,
                patient_account=encounter.patient_account,
                patient=encounter.patient_profile,
                position_in_queue=last_position + 1,
                status="waiting",
            )
            trigger_queue_realtime_update(queue)
            return queue
        except IntegrityError:
            logger.warning("Queue conflict retry %s", attempt)
            if attempt == MAX_RETRIES - 1:
                raise

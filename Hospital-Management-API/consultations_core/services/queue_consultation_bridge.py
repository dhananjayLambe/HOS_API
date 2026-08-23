"""
Bridge queue operational actions to encounter/consultation lifecycle.

Used by queue_management when helpdesk/doctor marks queue as in consultation.
"""

from django.core.exceptions import ValidationError as DjangoValidationError

from shared.logging import LogModule, logger

from consultations_core.services.consultation_start_service import (
    start_consultation_for_encounter,
)


def start_consultation_from_queue_entry(queue_entry, user):
    """
    When queue moves to in_consultation, ensure encounter has Consultation started
    (mirrors consultations StartConsultationAPIView intent for helpdesk queue UX).

    If no encounter is linked, no-op.
    """
    encounter = getattr(queue_entry, "encounter", None)
    if encounter is None:
        return

    try:
        start_consultation_for_encounter(
            encounter_id=encounter.id,
            user=user,
            source="helpdesk",
        )
    except DjangoValidationError as e:
        logger.warning(
            f"queue_consultation_bridge: consultation start failed for encounter {encounter.id}: {e}",
            module=LogModule.CONSULTATION,
            action="consultation.queue_bridge.start_failed",
            metadata={"source": "helpdesk"},
        )
    except Exception as e:
        logger.exception(
            f"queue_consultation_bridge: consultation create error for encounter {encounter.id}: {e}",
            module=LogModule.CONSULTATION,
            action="consultation.queue_bridge.create_failed",
            metadata={"source": "helpdesk"},
        )

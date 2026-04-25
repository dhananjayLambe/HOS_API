"""
Bridge queue operational actions to encounter/consultation lifecycle.

Used by queue_management when helpdesk/doctor marks queue as in consultation.
"""

import logging

from django.core.exceptions import ValidationError as DjangoValidationError

from consultations_core.domain.vitals_meaningful import vitals_data_is_meaningful
from consultations_core.models.consultation import Consultation
from consultations_core.models.pre_consultation import PreConsultationVitals
from consultations_core.services.encounter_state_machine import EncounterStateMachine
from consultations_core.services.preconsultation_lifecycle import (
    get_or_create_preconsultation_for_start_safe,
)

logger = logging.getLogger(__name__)


def _preconsultation_has_meaningful_vitals(pre) -> bool:
    try:
        row = PreConsultationVitals.objects.get(pre_consultation=pre)
    except PreConsultationVitals.DoesNotExist:
        return False
    return vitals_data_is_meaningful(row.data or {})


def start_consultation_from_queue_entry(queue_entry, user):
    """
    When queue moves to in_consultation, ensure encounter has Consultation started
    (mirrors consultations StartConsultationAPIView intent for helpdesk queue UX).

    If no encounter is linked, no-op.
    """
    encounter = getattr(queue_entry, "encounter", None)
    if encounter is None:
        return

    if Consultation.objects.filter(encounter=encounter).exists():
        if encounter.status != "consultation_in_progress":
            try:
                EncounterStateMachine.start_consultation(encounter, user=user)
            except DjangoValidationError as e:
                logger.warning(
                    "queue_consultation_bridge: could not transition encounter %s: %s",
                    encounter.id,
                    e,
                )
        return

    try:
        pre = get_or_create_preconsultation_for_start_safe(encounter, created_by=user)
    except Exception as e:
        logger.exception(
            "queue_consultation_bridge: preconsultation ensure failed for encounter %s: %s",
            encounter.id,
            e,
        )
        return

    if not pre.is_completed and not _preconsultation_has_meaningful_vitals(pre):
        pre.is_skipped = True
        pre.save(update_fields=["is_skipped"])

    try:
        Consultation.objects.create(encounter=encounter)
    except DjangoValidationError as e:
        logger.warning(
            "queue_consultation_bridge: consultation create failed for encounter %s: %s",
            encounter.id,
            e,
        )
    except Exception as e:
        logger.exception(
            "queue_consultation_bridge: consultation create error for encounter %s: %s",
            encounter.id,
            e,
        )

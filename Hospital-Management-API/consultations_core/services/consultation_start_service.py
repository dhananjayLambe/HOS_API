from dataclasses import dataclass
import logging

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction

from consultations_core.domain.vitals_meaningful import vitals_data_is_meaningful
from consultations_core.domain.encounter_status import normalize_encounter_status
from consultations_core.models.consultation import Consultation
from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.models.pre_consultation import PreConsultationVitals
from consultations_core.services.encounter_state_machine import EncounterStateMachine
from consultations_core.services.preconsultation_lifecycle import (
    get_or_create_preconsultation_for_start_safe,
)

logger = logging.getLogger(__name__)


@dataclass
class StartConsultationResult:
    encounter: ClinicalEncounter
    consultation: Consultation
    already_started: bool


def _preconsultation_has_meaningful_vitals(pre) -> bool:
    try:
        row = PreConsultationVitals.objects.get(pre_consultation=pre)
    except PreConsultationVitals.DoesNotExist:
        return False
    return vitals_data_is_meaningful(row.data or {})


@transaction.atomic
def start_consultation_for_encounter(*, encounter_id, user=None, source: str = "system") -> StartConsultationResult:
    """
    Idempotent consultation start flow with row locking.

    Handles doctor and helpdesk start paths through one transactional gateway:
    - lock encounter row
    - return existing consultation as success when already started
    - create consultation once when absent
    """
    encounter = ClinicalEncounter.objects.select_for_update().get(pk=encounter_id)
    logger.info(
        "encounter.lifecycle.consultation_start.request encounter_id=%s visit_pnr=%s source=%s status=%s user_id=%s",
        encounter.id,
        encounter.visit_pnr,
        source,
        encounter.status,
        getattr(user, "id", None),
    )

    normalized_status = normalize_encounter_status(encounter.status)
    if normalized_status in ("cancelled", "no_show"):
        raise DjangoValidationError("Visit is cancelled or marked no-show.")
    if normalized_status in ("consultation_completed", "closed"):
        raise DjangoValidationError("Consultation already completed for this visit.")

    consultation = Consultation.objects.select_for_update().filter(encounter=encounter).first()
    if consultation is not None:
        if normalize_encounter_status(encounter.status) != "consultation_in_progress":
            EncounterStateMachine.start_consultation(encounter, user=user)
            encounter.refresh_from_db()
        logger.info(
            "encounter.lifecycle.consultation_start.already_started encounter_id=%s consultation_id=%s visit_pnr=%s source=%s",
            encounter.id,
            consultation.id,
            encounter.visit_pnr,
            source,
        )
        return StartConsultationResult(
            encounter=encounter,
            consultation=consultation,
            already_started=True,
        )

    pre = get_or_create_preconsultation_for_start_safe(encounter, created_by=user)
    if not pre.is_completed and not _preconsultation_has_meaningful_vitals(pre):
        pre.is_skipped = True
        pre.save(update_fields=["is_skipped"])
        logger.info(
            "encounter.lifecycle.preconsultation.skipped encounter_id=%s preconsultation_id=%s visit_pnr=%s source=%s",
            encounter.id,
            pre.id,
            encounter.visit_pnr,
            source,
        )

    try:
        consultation = Consultation.objects.create(encounter=encounter)
        encounter.refresh_from_db()
        logger.info(
            "encounter.lifecycle.consultation_start.created encounter_id=%s consultation_id=%s visit_pnr=%s source=%s",
            encounter.id,
            consultation.id,
            encounter.visit_pnr,
            source,
        )
        return StartConsultationResult(
            encounter=encounter,
            consultation=consultation,
            already_started=False,
        )
    except IntegrityError:
        # Concurrent create race loser path: return existing consultation as success.
        consultation = Consultation.objects.select_for_update().get(encounter=encounter)
        if normalize_encounter_status(encounter.status) != "consultation_in_progress":
            EncounterStateMachine.start_consultation(encounter, user=user)
            encounter.refresh_from_db()
        logger.warning(
            "encounter.lifecycle.consultation_start.race_resolved encounter_id=%s consultation_id=%s visit_pnr=%s source=%s",
            encounter.id,
            consultation.id,
            encounter.visit_pnr,
            source,
        )
        return StartConsultationResult(
            encounter=encounter,
            consultation=consultation,
            already_started=True,
        )

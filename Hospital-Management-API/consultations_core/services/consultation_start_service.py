from dataclasses import dataclass

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction

from shared.logging import LogModule, logger
from shared.logging.context import get_context_manager

from consultations_core.domain.encounter_status import normalize_encounter_status
from consultations_core.domain.preconsultation_clinical import preconsultation_has_meaningful_vitals
from consultations_core.models.consultation import Consultation
from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.services.encounter_state_machine import EncounterStateMachine
from consultations_core.services.preconsultation_lifecycle import (
    get_or_create_preconsultation_for_start_safe,
)
from consultations_core.audit import ConsultationAuditService, emit_after_commit


@dataclass
class StartConsultationResult:
    encounter: ClinicalEncounter
    consultation: Consultation
    already_started: bool


def _enrich_consultation_log_context(encounter: ClinicalEncounter, consultation: Consultation | None = None) -> None:
    """Attach Wave-1 identifiers to LogContext for CloudWatch correlation."""
    fields: dict = {
        "encounter_id": str(encounter.id),
    }
    patient_profile_id = getattr(encounter, "patient_profile_id", None)
    if patient_profile_id:
        fields["patient_profile_id"] = str(patient_profile_id)
    patient_account_id = getattr(encounter, "patient_account_id", None)
    if patient_account_id:
        fields["patient_account_id"] = str(patient_account_id)
    if consultation is not None:
        fields["consultation_id"] = str(consultation.id)
    get_context_manager().update(**fields)


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
    _enrich_consultation_log_context(encounter)
    logger.info(
        (
            f"encounter.lifecycle.consultation_start.request encounter_id={encounter.id} "
            f"visit_pnr={encounter.visit_pnr} source={source} status={encounter.status} "
            f"user_id={getattr(user, 'id', None)}"
        ),
        module=LogModule.CONSULTATION,
        action="consultation.start.request",
        metadata={"encounter_id": str(encounter.id), "source": source},
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
        _enrich_consultation_log_context(encounter, consultation)
        logger.info(
            (
                f"encounter.lifecycle.consultation_start.already_started encounter_id={encounter.id} "
                f"consultation_id={consultation.id} visit_pnr={encounter.visit_pnr} source={source}"
            ),
            module=LogModule.CONSULTATION,
            action="consultation.start.already_started",
            metadata={
                "encounter_id": str(encounter.id),
                "consultation_id": str(consultation.id),
            },
        )
        return StartConsultationResult(
            encounter=encounter,
            consultation=consultation,
            already_started=True,
        )

    pre = get_or_create_preconsultation_for_start_safe(encounter, created_by=user)
    if not pre.is_completed and not preconsultation_has_meaningful_vitals(pre):
        pre.is_skipped = True
        pre.save(update_fields=["is_skipped"])
        logger.info(
            (
                f"encounter.lifecycle.preconsultation.skipped encounter_id={encounter.id} "
                f"preconsultation_id={pre.id} visit_pnr={encounter.visit_pnr} source={source}"
            ),
            module=LogModule.CONSULTATION,
            action="consultation.preconsultation.skipped",
            metadata={"encounter_id": str(encounter.id), "preconsultation_id": str(pre.id)},
        )

    try:
        consultation = Consultation.objects.create(encounter=encounter)
        encounter.refresh_from_db()
        _enrich_consultation_log_context(encounter, consultation)
        logger.info(
            (
                f"encounter.lifecycle.consultation_start.created encounter_id={encounter.id} "
                f"consultation_id={consultation.id} visit_pnr={encounter.visit_pnr} source={source}"
            ),
            module=LogModule.CONSULTATION,
            action="consultation.started",
            metadata={
                "encounter_id": str(encounter.id),
                "consultation_id": str(consultation.id),
            },
        )
        emit_after_commit(
            ConsultationAuditService.emit_started,
            encounter,
            consultation,
            user,
            source=source,
            already_started=False,
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
        _enrich_consultation_log_context(encounter, consultation)
        logger.warning(
            (
                f"encounter.lifecycle.consultation_start.race_resolved encounter_id={encounter.id} "
                f"consultation_id={consultation.id} visit_pnr={encounter.visit_pnr} source={source}"
            ),
            module=LogModule.CONSULTATION,
            action="consultation.start.race_resolved",
            metadata={
                "encounter_id": str(encounter.id),
                "consultation_id": str(consultation.id),
            },
        )
        return StartConsultationResult(
            encounter=encounter,
            consultation=consultation,
            already_started=True,
        )

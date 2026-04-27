import logging

from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.services.encounter_state_machine import EncounterStateMachine

logger = logging.getLogger(__name__)


class EncounterService:
    """
    Single entry point for creating Clinical Encounters.
    visit_pnr is generated in ClinicalEncounter.save() via VisitPNRService.
    """

    @staticmethod
    def get_active_encounter(patient_account, clinic):
        """
        Return the active encounter for this patient at this clinic, or None.
        Active = is_active=True (not yet closed/cancelled). Used for idempotent get-or-create.
        """
        return ClinicalEncounter.objects.filter(
            patient_account=patient_account,
            clinic=clinic,
            is_active=True,
        ).first()

    @staticmethod
    def get_or_create_encounter(
        *,
        clinic,
        patient_account,
        patient_profile,
        doctor=None,
        appointment=None,
        encounter_type="walk_in",
        entry_mode="helpdesk",
        created_by=None,
        consultation_type="FULL",
    ):
        """
        Return (encounter, created). If an active encounter exists for this
        patient+clinic, return it with created=False. Otherwise create and return
        with created=True.
        """
        if not clinic:
            raise ValueError("clinic is required to create an encounter.")
        existing = EncounterService.get_active_encounter(patient_account, clinic)
        if existing:
            logger.info(
                "encounter.lifecycle.reuse_active encounter_id=%s visit_pnr=%s patient_account_id=%s clinic_id=%s status=%s",
                existing.id,
                existing.visit_pnr,
                getattr(patient_account, "id", None),
                getattr(clinic, "id", None),
                existing.status,
            )
            return existing, False
        encounter = EncounterService.create_encounter(
            clinic=clinic,
            patient_account=patient_account,
            patient_profile=patient_profile,
            doctor=doctor,
            appointment=appointment,
            encounter_type=encounter_type,
            entry_mode=entry_mode,
            created_by=created_by,
            consultation_type=consultation_type,
        )
        logger.info(
            "encounter.lifecycle.created encounter_id=%s visit_pnr=%s patient_account_id=%s clinic_id=%s encounter_type=%s entry_mode=%s",
            encounter.id,
            encounter.visit_pnr,
            getattr(patient_account, "id", None),
            getattr(clinic, "id", None),
            encounter_type,
            entry_mode,
        )
        return encounter, True

    @staticmethod
    def create_encounter(
        *,
        clinic,
        patient_account,
        patient_profile,
        doctor=None,
        appointment=None,
        encounter_type="walk_in",
        entry_mode="helpdesk",
        created_by=None,
        consultation_type="FULL",
    ):
        if not clinic:
            raise ValueError("clinic is required to create an encounter.")
        return ClinicalEncounter.objects.create(
            clinic=clinic,
            patient_account=patient_account,
            patient_profile=patient_profile,
            doctor=doctor,
            appointment=appointment,
            encounter_type=encounter_type,
            entry_mode=entry_mode,
            created_by=created_by,
            updated_by=created_by,
            status="created",
            consultation_type=consultation_type,
        )

    @staticmethod
    def move_to_pre_consultation(encounter, user=None):
        """
        Transition encounter to pre_consultation state.
        """
        return EncounterStateMachine.move_to_pre_consultation(encounter, user)

    @staticmethod
    def move_to_consultation(encounter, user=None):
        """
        Transition encounter to in_consultation state.
        """
        return EncounterStateMachine.move_to_consultation(encounter, user)

    @staticmethod
    def complete_encounter(encounter, user=None):
        """
        Safely complete an encounter.
        """
        return EncounterStateMachine.complete(encounter, user)

    @staticmethod
    def cancel_encounter(encounter, user=None):
        """
        Safely cancel an encounter.
        """
        return EncounterStateMachine.cancel(encounter, user)

    @staticmethod
    def mark_no_show(encounter, user=None):
        """
        Mark encounter as no_show.
        """
        return EncounterStateMachine.mark_no_show(encounter, user)
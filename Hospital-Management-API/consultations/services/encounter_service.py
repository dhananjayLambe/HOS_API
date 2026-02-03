from consultations.models import ClinicalEncounter
from consultations.services.pnr_service import PNRService


class EncounterService:
    """
    Single entry point for creating Clinical Encounters.
    """

    @staticmethod
    def create_encounter(
        *,
        patient_account,
        patient_profile,
        doctor=None,
        appointment=None,
        encounter_type="walk_in",
        entry_mode="helpdesk",
        created_by=None
    ):
        consultation_pnr = PNRService.generate_pnr()
        prescription_pnr = PNRService.generate_pnr()

        return ClinicalEncounter.objects.create(
            consultation_pnr=consultation_pnr,
            prescription_pnr=prescription_pnr,
            patient_account=patient_account,
            patient_profile=patient_profile,
            doctor=doctor,
            appointment=appointment,
            encounter_type=encounter_type,
            entry_mode=entry_mode,
            created_by=created_by,
            updated_by=created_by,
            status="created",
        )
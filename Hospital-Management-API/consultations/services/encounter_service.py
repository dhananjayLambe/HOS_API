from consultations.models import ClinicalEncounter


class EncounterService:
    """
    Single entry point for creating Clinical Encounters.
    visit_pnr is generated in ClinicalEncounter.save() via VisitPNRService.
    """

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
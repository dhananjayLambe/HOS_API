"""
Pre-consultation helpers shared across API views and queue/consultation orchestration.

Kept out of `api/views/preconsultation.py` to avoid circular imports from queue_management.
"""

from django.db import transaction

from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.models.pre_consultation import PreConsultation
from consultations_core.services.preconsultation_service import (
    PreConsultationAlreadyExistsError,
    PreConsultationService,
)


def get_or_create_preconsultation_for_start(encounter, created_by):
    """
    Get or create PreConsultation for an encounter (for start-consultation flow).
    Pre must exist before starting consultation.
    """
    try:
        return encounter.pre_consultation
    except PreConsultation.DoesNotExist:
        pass
    pc = PreConsultation.objects.filter(encounter=encounter).first()
    if pc is not None:
        return pc
    with transaction.atomic():
        encounter = ClinicalEncounter.objects.select_for_update().get(pk=encounter.pk)
        pc = PreConsultation.objects.filter(encounter=encounter).first()
        if pc is not None:
            return pc
        doctor = encounter.doctor
        if not doctor:
            raise ValueError("Encounter must have a doctor to create pre-consultation")
        specialty_code = (getattr(doctor, "primary_specialization", None) or "").strip().lower()
        if not specialty_code:
            specialty_code = "general"
        return PreConsultationService.create_preconsultation(
            encounter=encounter,
            specialty_code=specialty_code,
            template_version="v1",
            entry_mode="doctor",
            created_by=created_by,
        )


def get_or_create_preconsultation_for_start_safe(encounter, created_by):
    """Same as get_or_create_preconsultation_for_start but maps race to existing row."""
    try:
        return get_or_create_preconsultation_for_start(encounter, created_by)
    except PreConsultationAlreadyExistsError:
        return PreConsultation.objects.get(encounter=encounter)

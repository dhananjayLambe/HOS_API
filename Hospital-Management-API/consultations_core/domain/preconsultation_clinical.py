"""Helpers for whether pre-consultation carries clinical content (orphan cleanup, start flow)."""

from __future__ import annotations

from consultations_core.domain.vitals_meaningful import vitals_data_is_meaningful
from consultations_core.models.pre_consultation import (
    PreConsultation,
    PreConsultationAllergies,
    PreConsultationChiefComplaint,
    PreConsultationMedicalHistory,
    PreConsultationVitals,
)


def preconsultation_has_meaningful_vitals(pre: PreConsultation) -> bool:
    try:
        row = PreConsultationVitals.objects.get(pre_consultation=pre)
    except PreConsultationVitals.DoesNotExist:
        return False
    return vitals_data_is_meaningful(row.data or {})


def _json_section_has_clinical_content(data: dict | None) -> bool:
    if not data or data == {}:
        return False
    for v in data.values():
        if v is None or v == "" or v == [] or v == {}:
            continue
        if isinstance(v, dict):
            if any(x is not None and x != "" and x != [] and x != {} for x in v.values()):
                return True
            continue
        return True
    return False


def preconsultation_is_clinically_empty(encounter) -> bool:
    """
    True if the encounter has no pre-consultation row, or pre exists but is not
    completed and has no meaningful vitals or section JSON.
    """
    pre = PreConsultation.objects.filter(encounter_id=encounter.pk).first()
    if pre is None:
        return True
    if pre.is_completed:
        return False
    if preconsultation_has_meaningful_vitals(pre):
        return False
    for model in (
        PreConsultationChiefComplaint,
        PreConsultationAllergies,
        PreConsultationMedicalHistory,
    ):
        row = model.objects.filter(pre_consultation=pre).first()
        if row and _json_section_has_clinical_content(row.data):
            return False
    return True

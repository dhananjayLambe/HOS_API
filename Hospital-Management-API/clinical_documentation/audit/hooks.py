"""Clinical documentation audit integration hooks."""

from __future__ import annotations

import logging
from typing import Any

from consultations_core.audit.commit import emit_after_commit

from clinical_documentation.audit.clinical_documentation_audit_service import (
    ClinicalDocumentationAuditService,
)
from clinical_documentation.audit.payload_builder import ClinicalDocumentationPayloadBuilder
from clinical_documentation.audit.section_diff import diff_allergy_section, vitals_payloads_equal

logger = logging.getLogger(__name__)


def schedule_diagnosis_audit(
    *,
    consultation,
    user,
    diagnosis_row,
    prior_state: dict[str, Any] | None,
    is_create: bool,
) -> None:
    try:
        encounter = consultation.encounter
        if is_create:
            emit_after_commit(
                ClinicalDocumentationAuditService.emit_diagnosis_added,
                encounter,
                consultation,
                user,
                diagnosis_row=diagnosis_row,
            )
            return
        changed_fields = ClinicalDocumentationPayloadBuilder.diff_diagnosis_fields(
            prior_state,
            diagnosis_row,
        )
        emit_after_commit(
            ClinicalDocumentationAuditService.emit_diagnosis_updated,
            encounter,
            consultation,
            user,
            diagnosis_row=diagnosis_row,
            changed_fields=changed_fields,
            prior_state=prior_state,
        )
    except Exception:
        logger.warning(
            "clinical_documentation_diagnosis_audit_schedule_failed",
            exc_info=True,
            extra={"diagnosis_id": str(getattr(diagnosis_row, "id", ""))},
        )


def schedule_symptom_audit(
    *,
    consultation,
    user,
    symptom_row,
    symptom_names: list[str] | None = None,
    chief_complaint: str | None = None,
) -> None:
    try:
        encounter = consultation.encounter
        emit_after_commit(
            ClinicalDocumentationAuditService.emit_symptoms_recorded,
            encounter,
            consultation,
            user,
            symptom_row=symptom_row,
            chief_complaint=chief_complaint,
            symptom_names=symptom_names,
        )
    except Exception:
        logger.warning(
            "clinical_documentation_symptom_audit_schedule_failed",
            exc_info=True,
            extra={"symptom_id": str(getattr(symptom_row, "id", ""))},
        )


def schedule_allergy_audits(
    *,
    encounter,
    user,
    section_obj,
    prior_data: dict[str, Any] | list | None,
    consultation=None,
    source: str = "doctor",
) -> None:
    try:
        diff = diff_allergy_section(prior_data, section_obj.data)
        for entry in diff["added"]:
            emit_after_commit(
                ClinicalDocumentationAuditService.emit_allergy_added,
                encounter,
                user,
                section_id=section_obj.id,
                allergy_entry=entry,
                consultation=consultation,
                source=source,
            )
        for item in diff["updated"]:
            emit_after_commit(
                ClinicalDocumentationAuditService.emit_allergy_updated,
                encounter,
                user,
                section_id=section_obj.id,
                allergy_key=item["key"],
                changed_fields=item["changed_fields"],
                prior_entry=item["before"],
                consultation=consultation,
                source=source,
            )
    except Exception:
        logger.warning(
            "clinical_documentation_allergy_audit_schedule_failed",
            exc_info=True,
            extra={"section_id": str(getattr(section_obj, "id", ""))},
        )


def schedule_vitals_audit(
    *,
    encounter,
    user,
    section_obj,
    prior_data: dict[str, Any] | None,
    consultation=None,
    source: str = "doctor",
) -> None:
    try:
        new_data = section_obj.data or {}
        if not vitals_payloads_equal(prior_data, new_data):
            emit_after_commit(
                ClinicalDocumentationAuditService.emit_vital_signs_recorded,
                encounter,
                user,
                section_id=section_obj.id,
                vitals_data=new_data,
                consultation=consultation,
                source=source,
            )
    except Exception:
        logger.warning(
            "clinical_documentation_vitals_audit_schedule_failed",
            exc_info=True,
            extra={"section_id": str(getattr(section_obj, "id", ""))},
        )

"""Clinical documentation audit integration hooks."""

from __future__ import annotations

from typing import Any

from consultations_core.audit.commit import emit_after_commit

from clinical_documentation.audit.clinical_documentation_audit_service import (
    ClinicalDocumentationAuditService,
)
from clinical_documentation.audit.payload_builder import ClinicalDocumentationPayloadBuilder
from clinical_documentation.audit.section_diff import diff_allergy_section, vitals_payloads_equal
from shared.logging import LogModule, logger


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
            "Clinical documentation diagnosis audit schedule failed",
            module=LogModule.CONSULTATION,
            action="clinical_documentation.audit.diagnosis_schedule_failed",
            metadata={"diagnosis_id": str(getattr(diagnosis_row, "id", ""))},
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
            "Clinical documentation symptom audit schedule failed",
            module=LogModule.CONSULTATION,
            action="clinical_documentation.audit.symptom_schedule_failed",
            metadata={"symptom_id": str(getattr(symptom_row, "id", ""))},
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
            "Clinical documentation allergy audit schedule failed",
            module=LogModule.CONSULTATION,
            action="clinical_documentation.audit.allergy_schedule_failed",
            metadata={"section_id": str(getattr(section_obj, "id", ""))},
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
            "Clinical documentation vitals audit schedule failed",
            module=LogModule.CONSULTATION,
            action="clinical_documentation.audit.vitals_schedule_failed",
            metadata={"section_id": str(getattr(section_obj, "id", ""))},
        )

---
owner: consultations_core-team
module: consultations_core
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Models — consultations_core

## ClinicalEncounter

| Field | Description |
|---|---|
| Purpose | Visit backbone — single source of truth for visit state |
| Status | [Encounter Status](../../shared_docs/status_registry.md#encounter-status) |
| Types | `consultation_type`: FULL, QUICK_RX, TEST_ONLY |
| Constraints | Status changes via EncounterStateMachine only |
| Events | Status log in `EncounterStatusLog` |

## Consultation

Clinical record linked to encounter. Symptoms, findings, diagnosis, etc.

## Prescription

| Status | draft → finalized → cancelled |
| Side effects | PDF + WhatsApp on finalize |

## Investigation models

| Status | suggested → ordered → completed → cancelled |
| Handoff | ordered → diagnostics_engine order |

## Audit

`AuditService` — field and status change logging.

## Related

Vitals, follow-ups, templates — see `models/` package (14 modules).

<!-- auto-generated:start -->
## Model reference (auto-generated from source)

### `ClinicalAuditLog`

- **Source:** `consultations_core/models/audit.py`
- **Fields:** `id`, `object_type`, `object_id`, `field_name`, `old_value`, `new_value`, `changed_by`, `source`, `reason`, `created_at`

### `ClinicalTemplate`

- **Source:** `consultations_core/models/clinical_templates.py`
- **Fields:** `id`, `doctor`, `name`, `consultation_type`, `template_data`, `is_active`, `usage_count`, `created_at`, `updated_at`

### `Consultation`

- **Source:** `consultations_core/models/consultation.py`
- **Fields:** `id`, `encounter`, `closure_note`, `follow_up_date`, `is_finalized`, `started_at`, `ended_at`, `created_at`, `updated_at`

### `CustomDiagnosis`

- **Source:** `consultations_core/models/diagnosis.py`
- **Fields:** `id`, `name`, `consultation`, `created_by`, `status`, `created_at`, `updated_at`, `deleted_at`, `deleted_by`

### `DiagnosisMaster`

- **Source:** `consultations_core/models/diagnosis.py`
- **Fields:** `id`, `key`, `label`, `clinical_term`, `icd10_code`, `category`, `is_chronic`, `severity_supported`, `is_primary_allowed`, `parent`, `synonyms`, `search_keywords`, `is_active`, `version`, `created_at`, `updated_at`, `deleted_at`, `deleted_by`

### `SpecialtyDiagnosisMap`

- **Source:** `consultations_core/models/diagnosis.py`
- **Fields:** `id`, `specialty`, `diagnosis`, `is_default`, `created_at`, `updated_at`, `deleted_at`, `deleted_by`

### `ConsultationDiagnosis`

- **Source:** `consultations_core/models/diagnosis.py`
- **Fields:** `id`, `display_name`, `consultation`, `master`, `custom_diagnosis`, `is_custom`, `label`, `icd_code`, `diagnosis_type`, `severity`, `is_primary`, `is_chronic`, `onset_date`, `resolved_date`, `doctor_note`, `ai_generated`, `ai_confidence_score`, `source`, `created_by`, `updated_by`, `created_at`, `updated_at`, `deleted_at`, `deleted_by`, `is_active`

### `EncounterDailyCounter`

- **Source:** `consultations_core/models/encounter.py`
- **Fields:** `id`, `clinic`, `date`, `counter`, `updated_at`, `created_at`

### `ClinicalEncounter`

- **Source:** `consultations_core/models/encounter.py`
- **Fields:** `id`, `visit_pnr`, `doctor`, `clinic`, `patient_account`, `patient_profile`, `appointment`, `encounter_type`, `status`, `consultation_type`, `entry_mode`, `is_active`, `created_by`, `updated_by`, `check_in_time`, `consultation_start_time`, `consultation_end_time`, `closed_at`, `started_at`, `completed_at`, `cancelled_at`, `cancelled_by`, `created_at`, `updated_at`

### `EncounterStatusLog`

- **Source:** `consultations_core/models/encounter.py`
- **Fields:** `encounter`, `from_status`, `to_status`, `changed_by`, `changed_at`

### `CustomFinding`

- **Source:** `consultations_core/models/findings.py`
- **Fields:** `id`, `name`, `consultation`, `created_by`, `status`, `created_at`, `updated_at`

### `FindingMaster`

- **Source:** `consultations_core/models/findings.py`
- **Fields:** `id`, `code`, `label`, `category`, `severity_supported`, `is_active`, `created_by`, `updated_by`, `created_at`, `updated_at`

### `ConsultationFinding`

- **Source:** `consultations_core/models/findings.py`
- **Fields:** `SEVERITY_CHOICES`, `id`, `consultation`, `finding`, `custom_finding`, `display_name`, `is_custom`, `severity`, `note`, `extension_data`, `is_active`, `updated_by`, `created_by`, `created_at`, `updated_at`

### `FollowUp`

- **Source:** `consultations_core/models/follow_up.py`
- **Fields:** `id`, `consultation`, `follow_up_type`, `follow_up_date`, `after_value`, `condition_note`, `reminder_enabled`, `is_completed`, `created_at`, `updated_at`, `added_by`

### `InstructionCategory`

- **Source:** `consultations_core/models/instruction.py`
- **Fields:** `id`, `code`, `name`, `description`, `display_order`, `is_active`, `created_at`, `updated_at`

### `InstructionTemplate`

- **Source:** `consultations_core/models/instruction.py`
- **Fields:** `id`, `key`, `label`, `category`, `description`, `requires_input`, `input_schema`, `is_global`, `is_active`, `version`, `created_by`, `created_at`, `updated_at`

### `InstructionTemplateVersion`

- **Source:** `consultations_core/models/instruction.py`
- **Fields:** `id`, `template`, `version_number`, `label_snapshot`, `input_schema_snapshot`, `created_at`, `updated_at`

### `SpecialtyInstructionMapping`

- **Source:** `consultations_core/models/instruction.py`
- **Fields:** `id`, `specialty`, `instruction`, `is_default`, `display_order`, `is_active`, `created_at`, `updated_at`

### `CustomDoctorInstruction`

- **Source:** `consultations_core/models/instruction.py`
- **Fields:** `id`, `doctor`, `text`, `normalized_text`, `usage_count`, `is_active`, `is_promoted`, `created_at`, `updated_at`

### `EncounterInstruction`

- **Source:** `consultations_core/models/instruction.py`
- **Fields:** `id`, `encounter`, `instruction_template`, `template_version`, `input_data`, `text_snapshot`, `source`, `custom_note`, `is_active`, `is_custom`, `updated_at`, `added_by`, `created_at`

### `InstructionAuditLog`

- **Source:** `consultations_core/models/instruction.py`
- **Fields:** `encounter_instruction`, `action`, `previous_data`, `new_data`, `performed_by`, `updated_at`, `created_at`

### `ConsultationInvestigations`

- **Source:** `consultations_core/models/investigation.py`
- **Fields:** `id`, `consultation`, `notes`, `is_active`, `created_at`, `updated_at`

### `CustomInvestigation`

- **Source:** `consultations_core/models/investigation.py`
- **Fields:** `id`, `name`, `investigation_type`, `created_by`, `clinic`, `is_active`, `created_at`

### `InvestigationItem`

- **Source:** `consultations_core/models/investigation.py`
- **Fields:** `id`, `investigations`, `source`, `catalog_item`, `custom_investigation`, `diagnostic_package`, `package_expansion_snapshot`, `prescription_source`, `name`, `investigation_type`, `instructions`, `notes`, `urgency`, `status`, `diagnostic_order_item`, `is_deleted`, `is_custom`, `position`, `created_at`, `updated_at`, `updated_by`, `deleted_at`, `deleted_by`, `objects`

### `PreConsultation`

- **Source:** `consultations_core/models/pre_consultation.py`
- **Fields:** `id`, `encounter`, `specialty_code`, `template_version`, `is_completed`, `is_skipped`, `completed_at`, `is_locked`, `locked_at`, `lock_reason`, `entry_mode`, `created_by`, `updated_by`, `is_active`, `created_at`, `updated_at`

### `BasePreConsultationSection`

- **Source:** `consultations_core/models/pre_consultation.py`
- **Fields:** `id`, `pre_consultation`, `section_code`, `schema_version`, `data`, `is_active`, `created_by`, `updated_by`, `created_at`, `updated_at`

### `PreConsultationVitals`

- **Source:** `consultations_core/models/pre_consultation.py`

### `PreConsultationChiefComplaint`

- **Source:** `consultations_core/models/pre_consultation.py`

### `PreConsultationAllergies`

- **Source:** `consultations_core/models/pre_consultation.py`

### `PreConsultationMedicalHistory`

- **Source:** `consultations_core/models/pre_consultation.py`

### `CustomMedicine`

- **Source:** `consultations_core/models/prescription.py`
- **Fields:** `id`, `name`, `dose_type`, `strength_value`, `strength_unit`, `notes`, `created_by`, `clinic`, `is_normalized`, `normalized_drug`, `created_at`, `updated_at`, `deleted_at`, `deleted_by`

### `Prescription`

- **Source:** `consultations_core/models/prescription.py`
- **Fields:** `id`, `consultation`, `version_number`, `is_active`, `prescription_pnr`, `status`, `finalized_at`, `pdf_file`, `created_by`, `created_at`, `updated_at`, `cancelled_at`, `cancelled_by`, `cancelled_by_source`, `cancel_reason_code`, `cancel_reason_text`, `cancelled_by_patient_profile`

### `PrescriptionLine`

- **Source:** `consultations_core/models/prescription.py`
- **Fields:** `id`, `prescription`, `drug`, `custom_medicine`, `drug_name_snapshot`, `generic_name_snapshot`, `strength_snapshot`, `formulation_snapshot`, `dose_value`, `dose_unit`, `route`, `frequency`, `duration_value`, `duration_unit`, `instructions`, `is_prn`, `is_stat`, `is_custom`, `created_at`, `updated_at`, `deleted_at`, `deleted_by`

### `PrescriptionInstruction`

- **Source:** `consultations_core/models/prescription.py`
- **Fields:** `id`, `prescription`, `advice`, `diet`, `precautions`, `created_at`, `updated_at`, `deleted_at`, `deleted_by`

### `Procedure`

- **Source:** `consultations_core/models/procedure.py`
- **Fields:** `id`, `consultation`, `notes`, `created_by`, `updated_by`, `created_at`, `updated_at`

### `CustomSymptom`

- **Source:** `consultations_core/models/symptoms.py`
- **Fields:** `id`, `name`, `consultation`, `created_by`, `status`, `created_at`, `updated_at`

### `SymptomMaster`

- **Source:** `consultations_core/models/symptoms.py`
- **Fields:** `id`, `code`, `display_name`, `specialty`, `is_active`, `created_at`, `updated_at`

### `ConsultationSymptom`

- **Source:** `consultations_core/models/symptoms.py`
- **Fields:** `id`, `consultation`, `symptom`, `custom_symptom`, `display_name`, `is_custom`, `duration_value`, `duration_unit`, `severity`, `onset`, `is_primary`, `extra_data`, `is_active`, `created_by`, `updated_by`, `created_at`, `updated_at`

### `SymptomExtensionData`

- **Source:** `consultations_core/models/symptoms.py`
- **Fields:** `id`, `symptom_entry`, `data`, `schema_version`, `created_by`, `updated_by`, `created_at`, `updated_at`

<!-- auto-generated:end -->

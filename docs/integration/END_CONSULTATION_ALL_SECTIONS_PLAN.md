# End Consultation All Sections Plan

## Goal

Move end-consultation persistence into a service layer that handles **all currently completed sections**:
- symptoms
- findings
- diagnosis
- medicines

The service should be extensible so future sections (investigations, instructions, procedures, etc.) can be added without rewriting the endpoint.

## Final guardrails (locked)

- Do **not** rewrite `EndConsultationAPIView`.
- Do **not** change existing persistence behavior for symptoms/findings/diagnosis.
- Add medicines persistence only, then wire through service.
- Run medicines persistence before `EncounterStateMachine.complete_consultation(...)`.

## Confirmed payload contract

Use `request.data.store.sectionItems` as the primary source:
- `store.sectionItems.symptoms`
- `store.sectionItems.findings`
- `store.sectionItems.diagnosis`
- `store.sectionItems.medicines`

Fallbacks (for backward compatibility):
- `symptoms`, `findings`, `diagnoses`, `medicines`
- `store.draftFindings` for findings when needed

## Current state (already working)

`consultations_core/api/views/preconsultation.py` (`EndConsultationAPIView`) already persists:
- symptoms
- findings
- diagnoses

It also finalizes encounter lifecycle after persistence.

## Gap

`medicines` are not persisted to prescription models at end-consultation yet, even though prescription models are designed for this workflow.

## Target architecture

1. Add `consultations_core/services/end_consultation_service.py` with orchestrator:
   - `persist_consultation_end_state(consultation, payload, user)`
2. Move persistence logic out of `EndConsultationAPIView` into service helpers:
   - `_persist_symptoms(...)`
   - `_persist_findings(...)`
   - `_persist_diagnoses(...)`
   - `_persist_medicines(...)`
3. Keep lifecycle transition in view after service success:
   - `EncounterStateMachine.complete_consultation(...)`
   - keep existing status and idempotency behavior.

## Medicines mapping plan

Read each medicine row from:
- `store.sectionItems.medicines[*].detail.medicine`

Map to `PrescriptionLine`:
- `drug_id` -> `DrugMaster`
- `dose_value` -> `dose_value`
- `dose_unit_id` -> resolve `DoseUnitMaster` by id (optional code fallback)
- `route_id` -> resolve `RouteMaster` by id (optional code fallback)
- `frequency_id` -> resolve `FrequencyMaster` by id (optional code fallback)
- `duration_value` / `duration_unit`
- `instructions`
- `is_prn`, `is_stat`

Create a `Prescription` for consultation and finalize only when at least one valid line exists.

## Section strategy (clear, safe, extensible)

- Symptoms: keep existing upsert behavior exactly as is.
- Findings: keep existing upsert + deactivate stale rows exactly as is.
- Diagnosis: keep existing upsert + deactivate stale rows exactly as is.
- Medicines: create/finalize prescription from payload.
- Future sections: add one helper per section and register in orchestrator map.

This avoids mixing business logic in the view and keeps section logic isolated.

## Transaction and failure behavior

Use one atomic boundary in service so if any section fails:
- all section writes rollback
- endpoint returns validation error
- encounter is not transitioned to completed

For medicines specifically:
- if medicines list is empty: skip prescription creation
- invalid `drug_id` / resolver failures: raise validation error (400 path), rollback all writes

## Files to modify during implementation

- `Hospital-Management-API/consultations_core/services/end_consultation_service.py` (new)
- `Hospital-Management-API/consultations_core/api/views/preconsultation.py`
- `Hospital-Management-API/consultations_core/api/views/consultation.py` (only if small endpoint hook/doc cleanup needed)
- tests under `Hospital-Management-API/consultations_core/` (add new cases)

## Validation checklist

1. Medicines present: prescription created, lines created, finalized.
2. No medicines: no prescription created, no error.
3. Invalid medicine references: 400 error, full rollback.
4. Existing active prescription: old deactivated, new active version created.
5. Existing symptoms/findings/diagnosis behavior remains unchanged.
6. Encounter transitions to `consultation_completed` only after persistence success.

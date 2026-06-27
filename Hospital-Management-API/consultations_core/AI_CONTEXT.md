---
owner: consultations_core-team
module: consultations_core
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# consultations_core — AI Context



## Module Purpose

Clinical encounter backbone, consultations, pre-consultation, prescriptions, investigations, vitals, and end-consultation orchestration (PDF, S3, WhatsApp).

## Read First

- [docs/BUSINESS_FLOW.md](docs/BUSINESS_FLOW.md)
- [docs/WORKFLOWS.md](docs/WORKFLOWS.md)
- [shared_docs/status_registry.md](../shared_docs/status_registry.md#encounter-status)
- [shared_docs/INVARIANTS.md](../shared_docs/INVARIANTS.md) — INV-003, INV-008

## Main Services

| Path | Role |
|---|---|
| `services/encounter_state_machine.py` | Strict encounter lifecycle |
| `services/end_consultation_service.py` | End consultation, PDF, delivery |
| `domain/audit.py` | AuditService |

## Important Models

`ClinicalEncounter`, `Consultation`, `Prescription`, investigation models

## Business Rules AI Must Never Violate

- Encounter.status is single source of truth — never infer state from form data (INV-008)
- No reverse encounter transitions (INV-003)
- Only explicit buttons change encounter state — navigation ≠ state change
- One visit = one encounter

## Do Not

- Create duplicate encounters without checking active encounter rules
- Roll back encounter status on validation failure

---
owner: platform-team
module: shared_docs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Data Ownership Registry

Every entity has exactly one owning app. Changes to schema, business rules, and lifecycle for an entity belong in the owner app.

## Ownership rules

1. **Create** — only the owner app creates the canonical record
2. **Update** — owner app controls mutable fields; consumers may update denormalized snapshots only where explicitly designed
3. **Delete** — soft-delete policies defined in owner app; many clinical entities cannot be hard-deleted
4. **Cross-app access** — via ForeignKey or service API, never duplicate master tables

## Entity ownership

| Entity | Owner | Cannot delete? | Audit |
|---|---|---|---|
| PatientProfile | patient_account | Yes (deactivate only) | Yes |
| Doctor | doctor | Yes | Yes |
| Appointment | appointments | Soft cancel | Yes |
| ClinicalEncounter | consultations_core | Yes after completion | Yes |
| Prescription | consultations_core | No hard delete after finalized | Yes |
| DiagnosticOrder | diagnostics_engine | Cancel only, not delete | Yes |
| DiagnosticTestReport | diagnostics_engine | No delete after delivered | Yes |
| LabOrderAssignment | labs | Cancel/complete only | Yes |
| WhatsApp delivery log | notifications | Never delete | Append-only |

See [glossary/business_entities.md](glossary/business_entities.md) for full entity map.

## Dispute resolution

When two apps appear to own the same concept:

1. Check [healthcare_terms.md](glossary/healthcare_terms.md) for canonical term
2. Clinical intent → consultations_core; commercial execution → diagnostics_engine; fulfillment → labs
3. Record decision as ADR in owning app

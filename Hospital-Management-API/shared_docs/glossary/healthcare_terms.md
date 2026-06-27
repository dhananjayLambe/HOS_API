---
owner: platform-team
module: shared_docs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Healthcare Terms Glossary

Canonical definitions. Apps MUST reference this document — do not redefine terms locally.

## Booking

| Field | Value |
|---|---|
| Definition | Patient's request to perform one or more diagnostic tests (commerce layer) |
| Owner | diagnostics_engine |
| Used By | labs, notifications, reports, consultations_core |
| Not to be confused with | [Appointment](#appointment), [Lab Assignment](#lab-assignment) |
| Model | `DiagnosticOrder` |
| Status values | [Order Status](../status_registry.md#order-status-diagnosticorder) |

## Order (Diagnostic Order)

| Field | Value |
|---|---|
| Definition | Executable commercial lab order linked to an encounter; contains priced items and test lines |
| Owner | diagnostics_engine |
| Model | `DiagnosticOrder` |
| Distinction from Booking | Booking is the user-facing act; Order is the persisted entity |

## Appointment

| Field | Value |
|---|---|
| Definition | Scheduled time slot for a doctor consultation (not a lab visit) |
| Owner | appointments |
| Used By | queue_management, consultations_core |
| Not to be confused with | [Booking](#booking), Lab Visit Appointment (labs) |

## Consultation

| Field | Value |
|---|---|
| Definition | Clinical record of a doctor-patient visit within an encounter |
| Owner | consultations_core |
| Model | `Consultation`, backed by `ClinicalEncounter` |

## Encounter

| Field | Value |
|---|---|
| Definition | Immutable clinical backbone for one patient visit; single source of truth for visit state |
| Owner | consultations_core |
| Model | `ClinicalEncounter` |
| Status field | `Encounter.status` — see [Encounter Status](../status_registry.md#encounter-status) |

## Prescription

| Field | Value |
|---|---|
| Definition | Medication orders issued at end of consultation; may be delivered via WhatsApp |
| Owner | consultations_core |
| Model | `Prescription` |
| Status values | [Prescription Status](../status_registry.md#prescription-status) |

## Investigation

| Field | Value |
|---|---|
| Definition | Diagnostic test ordered by doctor during consultation (clinical intent before commercial order) |
| Owner | consultations_core |
| Model | `ConsultationInvestigation` / investigation items |
| Handoff | Clinical investigation → `DiagnosticOrder` via `CreateDiagnosticOrderFromConsultationView` |

## Report

| Field | Value |
|---|---|
| Definition | Clinical result document for a test line; files stored as artifacts (S3) |
| Owner | diagnostics_engine |
| Model | `DiagnosticTestReport`, `DiagnosticReportArtifact` |
| Not to be confused with | `reports` app (operational analytics), Lab Assignment task card |

## Sample

| Field | Value |
|---|---|
| Definition | Physical specimen collected for diagnostic testing |
| Owner | labs (collection workflow) |
| Status trigger | Moves order to `sample_collected` |

## Collection

| Field | Value |
|---|---|
| Definition | Home or branch process of obtaining patient sample |
| Owner | labs |
| Types | Home collection (`CollectionStatus`), Branch visit (`LabVisitAppointment`) |

## Lab Assignment

| Field | Value |
|---|---|
| Definition | Routing of a diagnostic order to a specific lab branch for fulfillment |
| Owner | labs (execution), diagnostics_engine (routing decision) |
| Model | `LabOrderAssignment` |
| Not to be confused with | [Booking](#booking), Report task card (`task_id`) |

## Recommendation

| Field | Value |
|---|---|
| Definition | AI or rules-engine suggested tests/packages for a patient context |
| Owner | diagnostics_engine |
| Feature flag | `ENABLE_SUGGESTIONS`, `ENABLE_PACKAGE_SUGGESTIONS` |

## Recommendation vs Order

Recommendations are suggestions only. A [Booking](#booking) / [Order](#order-diagnostic-order) requires explicit patient or staff confirmation.

---
owner: platform-team
module: shared_docs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Business Entities — Ownership Map

Every entity has exactly one owning app. Other apps consume via FK or API — they do not own the entity.

| Entity | Owner App | Primary Model | Consumers |
|---|---|---|---|
| User / Auth | account | `User` | All apps |
| Patient Profile | patient_account | `PatientProfile` | appointments, consultations_core, diagnostics_engine, reports |
| Doctor Profile | doctor | `doctor` | appointments, consultations_core, clinic, queue_management |
| Clinic | clinic | `Clinic` | doctor, appointments, hospital_mgmt |
| Hospital | hospital_mgmt | `Hospital` | clinic, hospitalAdmin |
| Appointment (consultation schedule) | appointments | `Appointment` | queue_management, consultations_core |
| Queue Entry | queue_management | `QueueEntry` | consultations_core |
| Clinical Encounter | consultations_core | `ClinicalEncounter` | diagnostics_engine, reports |
| Consultation | consultations_core | `Consultation` | medicines, diagnostics_engine |
| Prescription | consultations_core | `Prescription` | medicines, notifications |
| Investigation Item | consultations_core | Investigation models | diagnostics_engine |
| Diagnostic Catalog (tests/packages) | diagnostics_engine | `DiagnosticServiceMaster`, `DiagnosticPackage` | labs, consultations_core |
| Diagnostic Order (Booking) | diagnostics_engine | `DiagnosticOrder` | labs, notifications, reports |
| Diagnostic Test Line | diagnostics_engine | `DiagnosticOrderTestLine` | labs |
| Diagnostic Report | diagnostics_engine | `DiagnosticTestReport` | labs, notifications |
| Lab Network / Branch | labs | `Lab`, `LabBranch` | diagnostics_engine |
| Lab Assignment | labs | `LabOrderAssignment` | diagnostics_engine, notifications |
| Home Collection | labs | Collection models | diagnostics_engine |
| Test Execution | labs | Test execution models | diagnostics_engine |
| Medicine Catalog | medicines | Medicine models | consultations_core |
| WhatsApp Delivery Log | notifications | Delivery models | consultations_core, diagnostics_engine |
| Helpdesk Ticket | helpdesk | Helpdesk models | consultations_core |
| Support Ticket | support | Support models | — |
| Calendar Event | caleder_events | Calendar models | doctor, appointments |
| Analytics Event | analytics | Analytics models | Internal only |

## Rules

1. Schema changes to an entity happen only in the owner app
2. Consumer apps use FKs or service APIs — never duplicate master data
3. When unsure where a change belongs, consult this table first

See also [ownership.md](../ownership.md) for detailed ownership policies.

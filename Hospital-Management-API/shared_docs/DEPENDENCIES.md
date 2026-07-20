---
owner: platform-team
module: shared_docs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# App Dependency Map

Cross-app coupling for developers and AI tools. See [event_registry.md](event_registry.md) for async events.

## consultations_core

| Direction | Module | Relationship |
|---|---|---|
| Depends On | account, doctor, patient_account, appointments, medicines, diagnostics_engine, notifications | Profiles, slots, Rx, orders, delivery |
| Publishes | Encounter status changes, prescription finalized | See event_registry |
| Consumes | Appointment check-in from queue_management | Encounter creation/resume |

## diagnostics_engine

| Direction | Module | Relationship |
|---|---|---|
| Depends On | consultations_core, patient_account, doctor, labs | Encounter, patient, fulfilling branch |
| Publishes | Order confirmed, report ready/delivered | notifications |
| Consumes | Investigation ordered from consultations_core | Order creation |

## labs

| Direction | Module | Relationship |
|---|---|---|
| Depends On | diagnostics_engine, patient_account | Orders, assignments, patient contact |
| Publishes | Assignment accepted/rejected, collection completed | diagnostics_engine status aggregation |
| Consumes | Routing assignments from diagnostics_engine | Fulfillment |

## doctor

| Direction | Module | Relationship |
|---|---|---|
| Depends On | account, clinic | User auth, clinic affiliation |
| Publishes | Profile updates | appointments, consultations_core |
| Consumes | — | — |

## appointments

| Direction | Module | Relationship |
|---|---|---|
| Depends On | doctor, patient_account, clinic | Scheduling |
| Publishes | Appointment status changes | queue_management |
| Consumes | Doctor availability from clinic/doctor | Slot generation |

## queue_management

| Direction | Module | Relationship |
|---|---|---|
| Depends On | appointments, doctor, consultations_core | Queue sync |
| Publishes | Check-in events | consultations_core |
| Consumes | Appointment scheduled | Queue entry |

## notifications

| Direction | Module | Relationship |
|---|---|---|
| Depends On | account | User/patient contact |
| Publishes | Delivery callbacks | consultations_core, diagnostics_engine audit |
| Consumes | Send requests from consultations_core, diagnostics_engine | Celery tasks |

## patient_account

| Direction | Module | Relationship |
|---|---|---|
| Depends On | account | User linkage |
| Publishes | Patient created/updated signals | doctor, appointments |
| Consumed By | Most clinical apps | Patient profile FK |

## medicines

| Direction | Module | Relationship |
|---|---|---|
| Depends On | — | Catalog master |
| Consumed By | consultations_core | Prescription autofill/search |

## reports (analytics app)

| Direction | Module | Relationship |
|---|---|---|
| Depends On | appointments, consultations_core | Read-only analytics |
| Publishes | — | — |

## Tier-3 apps

account, clinic, hospital_mgmt, hospitalAdmin, helpdesk, support, tasks, caleder_events, analytics, consultation_config — see each app's `docs/README.md`.

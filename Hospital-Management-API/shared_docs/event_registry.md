---
owner: platform-team
module: shared_docs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Cross-App Event Registry

Events for signals, Celery tasks, and future microservice boundaries.

## CONSULTATION_COMPLETED

| Field | Value |
|---|---|
| Publisher | consultations_core |
| Subscribers | notifications (WhatsApp), reports, analytics |
| Payload | `encounter_id`, `consultation_id`, `doctor_id`, `patient_id` |
| Trigger | `EncounterStateMachine` → `consultation_completed` |

## PRESCRIPTION_FINALIZED

| Field | Value |
|---|---|
| Publisher | consultations_core |
| Subscribers | notifications |
| Payload | `prescription_id`, `patient_id`, `pdf_url` |
| Trigger | End consultation / finalize prescription |

## PRESCRIPTION_WHATSAPP_QUEUED

| Field | Value |
|---|---|
| Publisher | consultations_core / notifications |
| Subscribers | Celery worker → Meta API |
| Async | `PRESCRIPTION_WHATSAPP_ASYNC` setting |

## DIAGNOSTIC_ORDER_CONFIRMED

| Field | Value |
|---|---|
| Publisher | diagnostics_engine |
| Subscribers | labs (assignment), notifications |
| Payload | `order_id`, `branch_id`, `patient_id` |

## REPORT_READY / REPORT_DELIVERED

| Field | Value |
|---|---|
| Publisher | diagnostics_engine |
| Subscribers | notifications |
| Payload | `report_id`, `line_id`, `patient_id` |
| Async | `REPORT_DELIVERY_ASYNC` setting |

## PATIENT_CREATED / PATIENT_UPDATED

| Field | Value |
|---|---|
| Publisher | patient_account (`signals.py`) |
| Subscribers | Internal indexing, analytics |

## APPOINTMENT_STATUS_CHANGED

| Field | Value |
|---|---|
| Publisher | appointments |
| Subscribers | queue_management |

## DOCTOR_PROFILE_UPDATED

| Field | Value |
|---|---|
| Publisher | doctor (`signals.py`) |
| Subscribers | Cache invalidation, dashboard |

## WHATSAPP_DELIVERY_CALLBACK

| Field | Value |
|---|---|
| Publisher | notifications (Meta webhook) |
| Subscribers | Append delivery log, audit update |
| Invariant | INV-004 — logs never deleted |

## Adding new events

1. Register here with stable name
2. Document in owning app's `docs/EVENTS.md`
3. Include publisher, subscribers, payload schema

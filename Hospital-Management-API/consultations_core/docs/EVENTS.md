---
owner: consultations_core-team
module: consultations_core
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Events — consultations_core

See [event_registry.md](../../shared_docs/event_registry.md).

## Published

| Event | Trigger | Subscribers |
|---|---|---|
| CONSULTATION_COMPLETED | Encounter → `consultation_completed` | notifications, reports |
| PRESCRIPTION_FINALIZED | End consultation / finalize Rx | notifications (WhatsApp) |
| Investigation ordered | Investigation status → ordered | diagnostics_engine |

## Consumed

| Event | Source |
|---|---|
| APPOINTMENT_CHECKED_IN | queue_management / appointments |

## Audit

All status changes logged via `AuditService` and `EncounterStatusLog`.

## Celery

Prescription WhatsApp when `PRESCRIPTION_WHATSAPP_ASYNC=True`.

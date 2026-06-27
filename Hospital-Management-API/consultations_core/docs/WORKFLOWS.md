---
owner: consultations_core-team
module: consultations_core
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Workflows — consultations_core

Statuses: [shared_docs/status_registry.md](../../shared_docs/status_registry.md#encounter-status).

## Encounter state machine

```mermaid
stateDiagram-v2
    [*] --> created
    created --> pre_consultation_in_progress
    created --> consultation_in_progress
    created --> cancelled
    created --> no_show
    pre_consultation_in_progress --> pre_consultation_completed
    pre_consultation_in_progress --> consultation_in_progress
    pre_consultation_in_progress --> cancelled
    pre_consultation_completed --> consultation_in_progress
    pre_consultation_completed --> cancelled
    consultation_in_progress --> consultation_completed
    consultation_in_progress --> cancelled
    consultation_completed --> closed
    consultation_completed --> cancelled
    closed --> [*]
    cancelled --> [*]
    no_show --> [*]
```

Controller: `EncounterStateMachine.transition()` — invalid transitions raise `ValidationError`.

## Sequence: Consultation completion

```mermaid
sequenceDiagram
    participant Doctor
    participant CC as consultations_core
    participant SM as EncounterStateMachine
    participant ECS as end_consultation_service
    participant S3
    participant Celery
    participant Notif as notifications

    Doctor->>CC: End consultation (confirm)
    CC->>SM: transition(consultation_completed)
    SM->>SM: Audit log, timestamps
    CC->>ECS: Finalize prescription
    ECS->>ECS: Generate PDF
    ECS->>S3: Upload prescription
    ECS->>Celery: Queue WhatsApp (PRESCRIPTION_WHATSAPP_ASYNC)
    Celery->>Notif: Send template message
    Notif-->>CC: Delivery callback (append log)
```

## Sequence: WhatsApp prescription delivery

```mermaid
sequenceDiagram
    participant Celery
    participant Notif as notifications
    participant Meta as WhatsApp_Meta
    participant Patient

    Celery->>Notif: send_prescription_whatsapp
    Notif->>Meta: Template message (patient_name, doctor_name, ...)
    Meta-->>Notif: Message ID
    Meta->>Patient: Prescription notification
    Meta-->>Notif: Delivery status webhook
    Notif->>Notif: Append delivery log (never delete)
```

Config: [CONFIGURATION.md](../../shared_docs/CONFIGURATION.md) — `WHATSAPP_*`, `PRESCRIPTION_WHATSAPP_ASYNC`.

## Sequence: Investigation → diagnostic order

```mermaid
sequenceDiagram
    participant Doctor
    participant CC as consultations_core
    participant DE as diagnostics_engine

    Doctor->>CC: Order investigation (status: ordered)
    CC->>DE: POST orders/create-from-consultation/
    DE->>DE: Create DiagnosticOrder (created)
    DE-->>CC: order_id
```

## Prescription lifecycle

`draft` → `finalized` → (optional) `cancelled`. Finalized prescriptions trigger delivery pipeline.

## Queue sync

Terminal encounter states sync queue via `_sync_queue_for_encounter_terminal`.

## Future

- `closed` state for archival after consultation_completed

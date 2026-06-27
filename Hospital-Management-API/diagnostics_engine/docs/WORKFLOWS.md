---
owner: diagnostics_engine-team
module: diagnostics_engine
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Workflows — diagnostics_engine

Status definitions: [shared_docs/status_registry.md](../../shared_docs/status_registry.md). Do not duplicate enums here.

## Order status state machine

```mermaid
stateDiagram-v2
    [*] --> created
    created --> confirmed
    created --> cancelled
    confirmed --> sample_collected
    confirmed --> cancelled
    sample_collected --> in_processing
    in_processing --> report_ready
    in_processing --> partial
    in_processing --> completed
    in_processing --> cancelled
    report_ready --> completed
    report_ready --> partial
    partial --> completed
    partial --> cancelled
    completed --> [*]
    cancelled --> [*]
```

**Invalid transitions:** Any backward step (e.g., `confirmed` → `created`). Enforced in `DiagnosticOrder.update_status()`.

**Side effect on confirm:** Expands packages and creates `DiagnosticOrderTestLine` rows.

## Routing lifecycle

```mermaid
stateDiagram-v2
    [*] --> awaiting_assignment
    awaiting_assignment --> routing_in_progress
    routing_in_progress --> assigned
    routing_in_progress --> routing_failed
    routing_in_progress --> no_match_found
    assigned --> [*]
```

## Sequence: Test booking (cart → confirm → lab assign)

```mermaid
sequenceDiagram
    participant Patient
    participant DE as diagnostics_engine
    participant Labs as labs
    participant Route as routing_service

    Patient->>DE: Add tests to cart (order created)
    Patient->>DE: Confirm order
    DE->>DE: update_status(confirmed)
    DE->>DE: Expand packages, create test lines
    DE->>Route: Run routing pipeline
    Route->>Route: Evaluate branch eligibility
    Route->>Labs: Create LabOrderAssignment
    Labs-->>DE: routing_status = assigned
    DE-->>Patient: Order confirmed + lab assigned
```

## Sequence: Report upload and delivery

```mermaid
sequenceDiagram
    participant Lab as labs
    participant DE as diagnostics_engine
    participant S3
    participant Celery
    participant Notif as notifications
    participant Patient

    Lab->>DE: POST reports/{report_id}/artifacts/upload/
    DE->>S3: Store artifact
    Lab->>DE: POST reports/{report_id}/mark-ready/
    DE->>DE: ReportLifecycleStatus = ready
    Lab->>DE: POST reports/{report_id}/deliver/
    DE->>S3: Generate presigned URL
    DE->>Celery: Queue delivery notification
    Celery->>Notif: Send WhatsApp / notify
    Notif->>Patient: Report link
    DE->>DE: Status = delivered (immutable)
```

## Report lifecycle

See [status_registry.md](../../shared_docs/status_registry.md#report-lifecycle-status): `pending` → `in_progress` → `ready` → `delivered`.

## Cancellation

`CancellationService`: package line cancel cascades to non-terminal test lines. Partial per-line cancel allowed before execution per product policy.

## Cross-app workflows

- Lab assignment acceptance: [labs/docs/WORKFLOWS.md](../../labs/docs/WORKFLOWS.md)
- Consultation investigation handoff: [consultations_core/docs/WORKFLOWS.md](../../consultations_core/docs/WORKFLOWS.md)

## Future stubs

- Payment workflow — not implemented
- Refund workflow — not implemented

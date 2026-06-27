---
owner: queue_management-team
module: queue_management
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Workflows — queue_management

Real-time patient queue via Django Channels (WebSocket).

## Check-in flow

```mermaid
sequenceDiagram
    participant Staff
    participant Queue as queue_management
    participant CC as consultations_core

    Staff->>Queue: Check in appointment
    Queue->>Queue: Update queue entry
    Queue->>CC: Trigger/resume encounter
    Queue-->>Staff: WebSocket broadcast
```

Base API: `/api/queue/`

## Events

Publishes check-in consumed by consultations_core — [event_registry.md](../../shared_docs/event_registry.md).

## Integration

Syncs with doctor OPD status and appointment status.

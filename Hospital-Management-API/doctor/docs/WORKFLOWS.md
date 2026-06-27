---
owner: doctor-team
module: doctor
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Workflows — doctor

## KYC onboarding

```mermaid
flowchart LR
    Register[Registration] --> Phase1[Phase 1 profile]
    Phase1 --> Upload[Upload documents]
    Upload --> Verify[KYC verify]
    Verify --> Active[Active doctor]
```

## OPD check-in / check-out

```mermaid
sequenceDiagram
    participant Doctor
    participant DocAPI as doctor API
    participant Queue as queue_management

    Doctor->>DocAPI: OPD check-in
    DocAPI->>DocAPI: Update OPD status
    DocAPI->>Queue: Sync queue state
    Doctor->>DocAPI: OPD check-out
    DocAPI->>Queue: Update availability
```

## Scheduling

Working hours + leaves + rules → consumed by appointments for slot generation.

See [appointments/docs/WORKFLOWS.md](../../appointments/docs/WORKFLOWS.md).

## Dashboard

`/api/v1/doctors/` — summary metrics for doctor dashboard UI.

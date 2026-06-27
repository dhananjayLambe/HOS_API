---
owner: labs-team
module: labs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Workflows — labs

Statuses: [shared_docs/status_registry.md](../../shared_docs/status_registry.md).

## Lab assignment state machine

```mermaid
stateDiagram-v2
    [*] --> PENDING
    PENDING --> ACCEPTED
    PENDING --> REJECTED
    PENDING --> CANCELLED
    ACCEPTED --> IN_PROGRESS
    ACCEPTED --> CANCELLED
    IN_PROGRESS --> COMPLETED
    IN_PROGRESS --> CANCELLED
    REJECTED --> [*]
    COMPLETED --> [*]
    CANCELLED --> [*]
```

Entry: `workflow_transitions.accept_assignment()`.

## Home collection state machine

Controller: `collection_workflow.py`

```mermaid
stateDiagram-v2
    [*] --> PENDING
    PENDING --> ASSIGNED
    ASSIGNED --> IN_PROGRESS
    IN_PROGRESS --> COLLECTED
    IN_PROGRESS --> FAILED
    PENDING --> CANCELLED
    ASSIGNED --> CANCELLED
    COLLECTED --> [*]
    FAILED --> [*]
    CANCELLED --> [*]
```

## Branch visit state machine

Controller: `visit_workflow.py`

```mermaid
stateDiagram-v2
    [*] --> PENDING
    PENDING --> CONFIRMED
    PENDING --> RESCHEDULED
    PENDING --> NO_SHOW
    CONFIRMED --> CHECKED_IN
    CONFIRMED --> RESCHEDULED
    CONFIRMED --> NO_SHOW
    CHECKED_IN --> COMPLETED
    CHECKED_IN --> NO_SHOW
    RESCHEDULED --> CONFIRMED
    COMPLETED --> [*]
    NO_SHOW --> [*]
    CANCELLED --> [*]
```

**Side effect:** Test execution provisioning at check-in.

## Sequence: Lab assignment + acceptance

```mermaid
sequenceDiagram
    participant DE as diagnostics_engine
    participant Labs as labs
    participant Op as LabOperator

    DE->>Labs: Create LabOrderAssignment (PENDING)
    Op->>Labs: Review assignment queue
    Op->>Labs: accept_assignment()
    Labs->>Labs: Status ACCEPTED
    Labs->>Labs: Create CollectionRequest OR VisitAppointment (PENDING)
    Labs-->>DE: Assignment accepted notification
```

## Sequence: Home collection

```mermaid
sequenceDiagram
    participant Phleb as Phlebotomist
    participant Labs as labs
    participant DE as diagnostics_engine

    Phleb->>Labs: Assign collector
    Labs->>Labs: Collection ASSIGNED → IN_PROGRESS
    Phleb->>Labs: Mark COLLECTED
    Labs->>Labs: Provision test executions
    Labs->>DE: Trigger order sample_collected
```

## Layer diagram

```mermaid
flowchart TB
    Order[DiagnosticOrder]
    Assign[LabOrderAssignment]
    Home[LabCollectionRequest]
    Visit[LabVisitAppointment]
    Exec[LabOrderTestExecution]

    Order --> Assign
    Assign --> Home
    Assign --> Visit
    Home --> Exec
    Visit --> Exec
```

## Legacy architecture docs

Detailed provisioning: former `documents/HOME_COLLECTION_PROVISIONING_ARCHITECTURE.md`, `TEST_EXECUTION_PROVISIONING_ARCHITECTURE.md` — summarized in [SERVICES.md](SERVICES.md).

## Operator manual

Lab pricing: `management/commands/lab_pricing_manual.md` — see [FAQ.md](FAQ.md).

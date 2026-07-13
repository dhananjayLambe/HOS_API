# Decision Engine Audit Framework (M4.4)

M4.4 introduces the **Decision Engine Audit Framework** — a reusable pattern for auditing *why* the system made a choice. Laboratory routing is Use Case #1.

## Three audit layers

| Layer | Answers |
|-------|---------|
| Clinical Audit | What happened to the patient record? |
| Business Workflow Audit (M4.2–M4.3) | How did the workflow execute? |
| **Decision Engine Audit (M4.4)** | **Why did the system choose this path?** |

## Identity model

| Identifier | Scope |
|------------|-------|
| `booking_id` | Stable booking (`DiagnosticOrder.id`) |
| `routing_id` / `workflow_instance_id` | Stable routing workflow (`RoutingRun.id` or ephemeral UUID for marketplace) |
| `decision_id` / `resource_id` | One per routing execution attempt |

`resource_type = Decision`, `resource_id = decision_id`.

## Package layout

```
business_audit/decision/
  constants.py, types.py, snapshot_builder.py
  certification/          # routing certification validators
  routing/                # Use Case #1 — Laboratory Routing
    constants.py
    payload_builder.py
    repository.py
    routing_audit_service.py
    hooks.py                # production integration surface
```

Future domains (pharmacy, doctor assignment, AI recommendations) add `business_audit/decision/<domain>/` without changing the Decision Snapshot schema.

## Core artifact

Mandatory `decision_snapshot` inside `new_value.payload` on `routing.lab_assigned` and `routing.manual_override`. See [DECISION_SNAPSHOT.md](DECISION_SNAPSHOT.md).

## Production integration

Production modules call **hooks only**:

```python
from business_audit.decision.routing.hooks import schedule_routing_decision_started
```

Post-booking pipeline is wired in `RoutingService` and `AssignmentService`. Marketplace path is wired in `LabRecommendationService.recommend`.

## Related docs

- [DECISION_STATE_MACHINE.md](DECISION_STATE_MACHINE.md)
- [DECISION_SNAPSHOT.md](DECISION_SNAPSHOT.md)
- [ROUTING_AUDIT.md](ROUTING_AUDIT.md)
- [ROUTING_CERTIFICATION.md](ROUTING_CERTIFICATION.md)

# Workflow Model

## Hierarchy

Support Trace indexes nested operational workflows using parent links and depth.

```
Recommendation (depth 0)
    └── Booking (depth 1)
            └── Routing (depth 2)
                    └── Report Delivery (depth 3)
```

| `workflow_type` | Default `workflow_depth` |
|-----------------|--------------------------|
| `Recommendation` | 0 |
| `Booking` | 1 |
| `WhatsAppFlow` | 1 |
| `Routing` | 2 |
| `Notification` | 2 |
| `Payment` | 2 |
| `ReportDelivery` | 3 |

Depth is resolved in `domain/workflow_relationships.py` via `resolve_workflow_depth()`. Callers may pass an explicit `workflow_depth` to override defaults.

## Parent linkage

| Field | Rule |
|-------|------|
| `parent_workflow_instance_id` | Optional; must not equal `workflow_instance_id` |
| `workflow_instance_id` | Unique natural key |

Child workflows inherit `correlation_id` from `LogContext` or explicit parameters. Parent-child relationships enable support staff to walk the tree from a booking back to its originating recommendation.

## TraceStatus FSM

| Status | Terminal? | Typical meaning |
|--------|-----------|-----------------|
| `Started` | No | Workflow created |
| `Running` | No | Active processing |
| `Waiting` | No | Blocked on external input |
| `Completed` | Yes | Successful terminal state |
| `Failed` | Yes | Unrecoverable error |
| `Cancelled` | Yes | User or system cancellation |
| `Expired` | Yes | TTL exceeded |

### Transition rules (validator)

1. **Sequence monotonicity:** On update, `last_sequence_no` must not decrease when a prior value exists.
2. **Terminal regression guard:** Once `status` is terminal (`Completed`, `Failed`, `Cancelled`, `Expired`), it cannot regress to a non-terminal status.

### `workflow_step` vs `current_state`

| Field | Purpose |
|-------|---------|
| `workflow_step` | Named step in the workflow (e.g. `"lab_assignment"`) |
| `current_state` | Domain FSM state (e.g. Business Audit `WorkflowStatus`) |

M5.1 does not enforce a full step graph — it records the latest values from sync events.

## Workflow health (derived)

`workflow_health` is computed in `SupportTraceService`, not stored from callers:

| Condition | Health |
|-----------|--------|
| `sync_status = Failed` | Failed |
| `sync_status = Retry` | Warning |
| `status = Failed` | Failed |
| `status = Cancelled` | Blocked |
| `status = Expired` or `Waiting` | Warning |
| Terminal success (`Completed`) | Healthy |
| Active (`Started`, `Running`) | Healthy |

## Duration

`duration_ms` is computed in the service when `status = Completed`:

```
duration_ms = (completed_at or event_at) - (first_event_at or started_at)
```

Not set by the builder. Enables "workflow took 4.2s" support queries without scanning audit history.

## Correlation propagation

`apply_trace_context()` updates `LogContext` after a successful upsert:

- `workflow_instance_id`
- `correlation_id`

Ensures subsequent audit and log records in the same request carry consistent trace identifiers.

# Workflow State Model

Support Trace stores the **latest** operational state of each workflow. History lives in Clinical and Business Audit.

## State fields

| Field | Purpose |
|-------|---------|
| `current_state` | FSM node (e.g. `Confirmed`, `Assigned`) |
| `workflow_step` | Human-readable step for support |
| `status` | `TraceStatus` (Started / Running / Waiting / Completed / Failed / Cancelled / Expired) |
| `last_event` | Latest event label |
| `started_at` / `last_event_at` / `completed_at` | Timestamps |
| `duration_ms` | Finalized on terminal statuses |
| `retry_count` | Incremented on retry actions |
| `current_snapshot` | Latest-only JSON (lab, channel, retry_reason) |
| `trace_version` | Optimistic concurrency |
| `projection_version` | Projection logic version |

## API

```python
from support_trace.workflow.workflow_state_service import WorkflowStateService

WorkflowStateService.update_workflow_state(
    resolved=resolved,
    transition=transition,
    last_source=TraceSource.BUSINESS_AUDIT,
)
```

Production code must not call this directly — use `ProjectionEngine.project(SupportTraceSyncEvent)`.

## Duration

Finalized when `finalize_duration` is set or `TraceStatus` is terminal:

```
duration_ms = (completed_at or event_at) - (first_event_at or started_at)
```

## Retry

Actions such as `recommendation.retried` and `report.delivery_retried` set `increment_retry=True`. Latest `retry_reason` is stored in `current_snapshot` only.

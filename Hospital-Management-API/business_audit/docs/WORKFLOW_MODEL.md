# Workflow Model

## Naming rules

| Term | Meaning | Example |
|---|---|---|
| `workflow_type` | Workflow definition/category | `WhatsAppFlow`, `Booking` |
| `workflow_instance_id` | Runtime execution UUID | `550e8400-e29b-41d4-a716-446655440000` |
| `parent_workflow_instance_id` | Parent execution for nested workflows | Booking instance under Recommendation |

Never use bare `workflow_id` — it conflates definition with execution.

## Lifecycle timeline

All events for one execution share the same `workflow_instance_id`. Ordering within an instance uses `sequence_no` (monotonic, assigned automatically when omitted).

Typical lifecycle:

```
seq 1  workflow.started   status=Started
seq 2  workflow.queued    status=Queued
seq 3  workflow.running   status=Running
seq 4  workflow.completed status=Completed, outcome=Success|Failure
```

A workflow can finish with `status=Completed` and `outcome=Failure` — the lifecycle ended, but the result failed.

## Nested workflows

Child workflows receive a new `workflow_instance_id` and set `parent_workflow_instance_id` to the parent execution:

```
Recommendation (parent)
  └── Booking (child, parent=recommendation_instance_id)
        └── WhatsApp (child, parent=booking_instance_id)
```

Query patterns:

- Timeline for one execution: `get_by_workflow_instance(workflow_instance_id)`
- Direct children: `filter_by_parent_workflow(parent_workflow_instance_id)`
- Full patient journey: `get_by_correlation(correlation_id)`

## Async propagation

All async entry points must inherit and pass through the same tracing keys:

```
HTTP Request → Celery task → Webhook handler → Scheduler job
         ↓              ↓              ↓                ↓
   same correlation_id + workflow_instance_id (+ parent when nested)
```

### Pattern

1. At workflow initiation (HTTP or scheduler), set `LogContext`:

```python
from business_audit.domain.context import apply_workflow_context, generate_workflow_instance_id
from shared.logging.context import get_context_manager, LogContext

workflow_instance_id = generate_workflow_instance_id()
get_context_manager().set(LogContext(
    correlation_id=correlation_id,
    workflow_instance_id=workflow_instance_id,
))
```

2. Before dispatching a Celery task, pass context fields as task kwargs and restore at task start:

```python
@shared_task
def deliver_report(*, correlation_id, workflow_instance_id, parent_workflow_instance_id=None):
    apply_workflow_context(
        correlation_id=correlation_id,
        workflow_instance_id=workflow_instance_id,
        parent_workflow_instance_id=parent_workflow_instance_id,
    )
    ...
```

3. For webhooks, extract or map provider reference to the in-flight `workflow_instance_id` from your workflow store or message metadata.

4. For nested child workflows, generate a new `workflow_instance_id` and set `parent_workflow_instance_id` to the current execution before recording child events.

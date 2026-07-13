# Celery Context (M5.8)

When a trace is recorded inside a Celery task, runtime metadata includes task execution context.

## CeleryContextResolver

`support_trace/runtime/celery_context.py` extracts:

| Key | Source |
|-----|--------|
| `celery_task_id` | `task.request.id` |
| `celery_queue` | `delivery_info.routing_key` or `exchange` |
| `celery_worker` | `task.request.hostname` or local hostname |

Resolution is **read-at-record** — no changes to Phase 2 Celery signal wiring.

## Repository lookup

```python
SupportTraceRepository().get_by_celery_task(task_id)
```

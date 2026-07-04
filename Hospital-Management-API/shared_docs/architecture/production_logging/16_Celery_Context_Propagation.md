16_Celery_Context_Propagation.md

DoctorProCare Celery Context Propagation

Document Type: Technical Design Specification

Version: 1.0

Status: Production Design

Related Documents

* [04_Correlation_Framework.md](04_Correlation_Framework.md)
* [14_Correlation_ID_Framework.md](14_Correlation_ID_Framework.md)
* [15_Logger_Context_Integration.md](15_Logger_Context_Integration.md)

⸻

Purpose

Preserve the active `LogContext` (especially `correlation_id`) when work moves from API/process → Celery broker → worker, so M2.4 logger enrichment continues inside tasks without developer changes.

⸻

Architecture

```
Publisher process                    Worker process
─────────────────                    ──────────────
ContextManager.get()
        │
        ▼
ContextSerializer.serialize()
        │
        ▼
before_task_publish / Task.apply*
        │
        ▼
Celery headers["doctorprocare_log_context"]
        │
        └──────────────────────────────► task_prerun
                                              │
                                              ▼
                                        ContextManager.set()
                                              │
                                              ▼
                                        Task business logic
                                              │
                                              ▼
                                        logger (M2.4 enricher)
                                              │
                                              ▼
                                        task_postrun / task_failure
                                              │
                                              ▼
                                        ContextManager.clear()
```

*CTO delegation pattern:* Celery signal handlers and the custom `Task` base orchestrate only — they call `context_serializer` + `ContextManager`, never embed field logic inline.

⸻

Modules

| Module | Responsibility |
|--------|----------------|
| `context_serializer.py` | Transport-agnostic `serialize_log_context` / `deserialize_log_context` |
| `celery_context.py` | Signal wiring, `LogContextPropagationTask`, header preparation |
| `constants.py` | `CELERY_LOG_CONTEXT_HEADER = "doctorprocare_log_context"` |
| `main/celery.py` | `app.Task = LogContextPropagationTask`, `register_celery_context_signals()` |

⸻

Header Format

Flat JSON-serializable dict of non-`None` `LogContext` fields:

```json
{
  "correlation_id": "550e8400-e29b-41d4-a716-446655440000",
  "request_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "booking_id": "BK-12345"
}
```

Invalid `correlation_id` values deserialize to an empty `LogContext` (never fail the task).

⸻

Signal and Task Behavior

| Hook | Action |
|------|--------|
| `before_task_publish` | Stamp headers when active context is non-empty (broker path) |
| `LogContextPropagationTask.apply` / `apply_async` | Stamp headers on eager/local apply paths (bypasses AMQP publish) |
| `task_prerun` | Restore context from `task.request.headers` |
| `task_postrun` | Clear `ContextManager`; retain eager sibling stamp on success only |
| `task_failure` | Clear context and pending stamp |

**Rules:**

* No changes to application `@shared_task` functions
* Publish with no active context → no header (scheduled/beat tasks unchanged)
* Nested tasks: child published while parent context is active inherits a snapshot at publish time
* Retries: same headers re-delivered; prerun restores again; postrun/failure clears between attempts
* Chains/groups (production): next step dispatched before parent `task_postrun`, while context is still active
* Chains/groups (eager tests): sibling stamp carries context between sequential `apply()` calls

⸻

Wiring

`main/celery.py` (after `app` creation, before `autodiscover_tasks`):

```python
from shared.logging.celery_context import (
    LogContextPropagationTask,
    register_celery_context_signals,
)

app.Task = LogContextPropagationTask
# ... autodiscover_tasks(), configure_logging() ...
register_celery_context_signals()
```

No changes to `logger.py`, `context_enricher.py`, or application task modules.

⸻

Test Matrix

| Scenario | Assertion |
|----------|-----------|
| Basic | `task.delay()` preserves `correlation_id` |
| Nested | Parent and child share `correlation_id` |
| Retry | Context present on retry; cleared after completion |
| Chain | Both chain steps enriched |
| Group | All group members share `correlation_id` |
| Failure | Context cleared; subsequent task has no leak |
| No context | Task without header succeeds; no context keys |
| Cleanup | `get_context_manager().get()` empty after task |

Tests use `CELERY_TASK_ALWAYS_EAGER = True` in `main/settings_test.py`.

⸻

Explicit Exclusions

* Modifying existing app tasks to pass context manually
* OpenTelemetry / distributed tracing
* Clinical/Business audit
* M2.3 middleware implementation
* Public export of serializer/celery modules from `__init__.py`

⸻

Acceptance Criteria

* Active `LogContext` serialized into Celery publish headers automatically
* Worker restores context before task body; clears after completion/failure
* Nested tasks, retries, chains, and groups preserve `correlation_id`
* No context leakage between consecutive unrelated tasks
* Application task code unchanged; `make test-logging-certification` passes (≥95%)

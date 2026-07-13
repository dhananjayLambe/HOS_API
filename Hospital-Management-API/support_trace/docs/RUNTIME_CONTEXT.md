# Runtime Context (M5.8)

M5.8 captures **operational runtime references** at trace record time and stores them on `SupportTrace.runtime_metadata` (JSONField). Support Trace stores **links and identifiers** — not log content.

## RuntimeContext

Frozen DTO in `support_trace/runtime/types.py`:

| Field | Source |
|-------|--------|
| `correlation_id`, `request_id` | Structured logger `LogContext` |
| `log_group`, `log_stream`, `log_region` | Logger integration / env |
| `celery_task_id`, `celery_worker`, `celery_queue` | Celery task request (when available) |
| `lambda_request_id` | `AWS_REQUEST_ID` env (Lambda only) |
| `deployment_version`, `git_commit`, `release_version` | Deployment env vars |
| `hostname`, `environment`, `availability_zone`, `aws_account` | Host / deployment metadata |

## Resolution pipeline

```
LogContext → RuntimeResolver → RuntimeContextBuilder → RuntimeBuilder → runtime_metadata
```

`RuntimeIntegrationService` is the public API:

```python
from support_trace.runtime import RuntimeIntegrationService

ctx = RuntimeIntegrationService.capture_runtime()
metadata = RuntimeIntegrationService.build_metadata(ctx)
url = RuntimeIntegrationService.build_cloudwatch_link(ctx)
```

## Integration

`SupportTraceService.record()` shallow-merges captured runtime into `runtime_metadata` after upsert (fail-open via `fail_open_runtime`).

## REST exposure

Use `expand=logs` or `expand=runtime` on investigation endpoints to include a `runtime` block in the response envelope.

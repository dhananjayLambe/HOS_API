# Logger Integration (M5.8)

Runtime capture reads the active structured logging configuration to populate log group, stream, and region on traces.

## LoggerIntegration

`support_trace/runtime/logger_integration.py` resolves targets from:

1. `LoggingConfig` (shared logging factory)
2. `CLOUDWATCH_LOG_GROUP` / `CLOUDWATCH_LOG_STREAM` environment variables
3. `AWS_REGION` / `AWS_DEFAULT_REGION`

## LogContext

Primary correlation path uses `shared.logging.context.LogContext`:

- `correlation_id`
- `request_id`
- `workflow_instance_id`

`RuntimeResolver.resolve(log_context=...)` merges logger, Celery, Lambda, and deployment sources.

## Fail-open

All runtime capture is wrapped in `fail_open_runtime` — projection and audit writes never fail because of observability metadata.

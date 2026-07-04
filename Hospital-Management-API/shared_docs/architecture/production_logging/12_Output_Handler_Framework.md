12_Output_Handler_Framework.md

DoctorProCare Production Output Handler Framework

Document Type: Technical Design Specification

Version: 1.0

Status: Production Ready

Related Documents

* [03_Logger_Framework.md](03_Logger_Framework.md)
* [08_CloudWatch_Integration.md](08_CloudWatch_Integration.md)
* [11_Exception_Framework.md](11_Exception_Framework.md)

⸻

Purpose

Milestone 6 completes the **output layer** of the DoctorProCare logging platform. Handlers deliver pre-formatted JSON to destinations. CloudWatch is the first production implementation; future handlers (OpenSearch, Datadog, Grafana, Kafka) implement the same contract.

Application code never knows which handlers are active.

⸻

Architecture

```
Application
    → Logger API
    → Validation
    → LogRecord
    → JSON Formatter (inside handler.emit_record)
    → Log Dispatcher
        → ConsoleLogHandler
        → CloudWatchLogHandler
        → Future handlers
```

Layers above the dispatcher are unchanged in M6.

⸻

Handler Contract

Every handler implements:

* `emit(formatted_record: str)` — deliver JSON
* `flush()` — drain buffers
* `close()` — flush and release resources

Handlers must not:

* Build LogRecords
* Inspect business metadata
* Modify JSON payloads
* Generate correlation IDs

⸻

CloudWatch Handler (M6)

* Uses `boto3.client("logs")` with adaptive retries
* Verifies log group exists (infrastructure creates groups)
* Creates log streams: `{service_name}/{hostname}/{YYYY-MM-DD}`
* Batches up to 10 events; flushes on interval, explicit flush, or shutdown
* Retries transient errors; fails fast on configuration/permission errors
* Raises `HandlerError` on delivery failure (dispatcher swallows)

⸻

Failure Policy

```
Handler failure → HandlerError → Dispatcher catches → Application continues
```

⸻

Lifecycle

| Phase | Action |
|-------|--------|
| Startup | Factory creates handlers, registers dispatcher, `atexit` hook |
| Runtime | `emit` → buffer → auto/manual flush |
| Shutdown | `dispatcher.close()` flushes all handlers |

⸻

Out of Scope (M6)

* Correlation IDs (Correlation Framework)
* CloudWatch dashboards, metric filters, SNS alarms
* OpenSearch / Datadog / Grafana / Kafka implementations
* Clinical / Business Audit

⸻

Future Handlers

Add a new class implementing `BaseLogHandler`, register in `HANDLER_REGISTRY` in [factory.py](../../shared/logging/factory.py). No changes to logger, formatter, or application code required.

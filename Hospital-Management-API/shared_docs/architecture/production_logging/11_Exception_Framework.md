11_Exception_Framework.md

DoctorProCare Structured Exception Framework

Document Type: Technical Design Specification

Version: 1.0

Status: Production Design

Related Documents

* [03_Logger_Framework.md](03_Logger_Framework.md)
* [01_Logging_Principles.md](01_Logging_Principles.md) — Principle 10 (Actionable Errors)

⸻

Purpose

Define how DoctorProCare captures and serializes exception diagnostics through the shared logging platform.

Application code reports failures via `logger.exception()`. The framework collects type, message, and stack trace. Output destinations (console, CloudWatch, OpenSearch) are determined solely by configured handlers — the exception framework does not reference any storage backend.

⸻

Architecture

```
Application Exception
        │
        ▼
logger.exception()
        │
        ▼
Exception Builder (exception_builder.py)
        │
        ▼
LogRecord
        │
        ▼
Dispatcher
        │
        ▼
JSON Formatter (nested exception object)
        │
        ▼
Configured Handlers
   ├── Console
   ├── CloudWatch (M6)
   └── Future Handlers
```

⸻

Design Principles

* Application code never calls `traceback.format_exc()` directly.
* Stack traces live on `LogRecord.stack_trace`, not in metadata.
* Metadata contains business context only.
* Missing exception context raises `LoggingError` — no silent incomplete logs.
* Handlers emit formatted JSON only; they do not inspect or enrich exceptions.

⸻

JSON Schema Extension

Exception logs add optional top-level `duration_ms` and a nested `exception` object:

```json
{
  "exception": {
    "type": "IntegrityError",
    "message": "duplicate key value",
    "stack_trace": "Traceback..."
  }
}
```

`schema_version` remains `1`. Fields are additive.

⸻

Out of Scope

* Correlation IDs (see [04_Correlation_Framework.md](04_Correlation_Framework.md))
* Alerting, retry logic, notifications
* CloudWatch I/O implementation (see [08_CloudWatch_Integration.md](08_CloudWatch_Integration.md))
* Django middleware or global `sys.excepthook`

⸻

Implementation

Package: `shared/logging/`

| Module | Role |
|--------|------|
| `exception_builder.py` | `capture_exception()`, reserved metadata validation |
| `logger.py` | `exception()` public API |
| `record.py` | `exception_type`, `exception_message`, `stack_trace` |
| `formatter.py` | Nested `exception` serialization |

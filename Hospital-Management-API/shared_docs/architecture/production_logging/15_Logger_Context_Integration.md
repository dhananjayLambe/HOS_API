15_Logger_Context_Integration.md

DoctorProCare Logger Context Integration

Document Type: Technical Design Specification

Version: 1.0

Status: Production Design

Related Documents

* [14_Correlation_ID_Framework.md](14_Correlation_ID_Framework.md)
* [04_Correlation_Framework.md](04_Correlation_Framework.md)
* [03_Logger_Framework.md](03_Logger_Framework.md)

⸻

Purpose

Define how the logging framework automatically enriches every log record with the active request context without requiring application code changes.

After M2.4, developers continue calling `logger.info(...)` while Correlation ID, Request ID, and business identifiers appear on every log automatically.

⸻

Architecture

```
Application
    │
    ▼
logger.info()
    │
    ▼
ContextEnricher          ← internal; logger never calls ContextManager directly
    │
    ▼
ContextManager (M2.2)
    │
    ▼
LogContext
    │
    ▼
enrich_record() → LogRecord
    │
    ▼
JSON Formatter
    │
    ▼
Handlers
```

⸻

Design Principles

* The logger orchestrates validation, enrichment, and dispatch only.
* The logger never imports Django, Celery, or `ContextVar`.
* Context retrieval is delegated to `ContextEnricher` (internal module).
* Framework-managed context fields cannot be passed via `metadata`.
* Framework context always wins; no caller override.
* Missing context must not prevent logging (CLI, startup, management commands).

⸻

ContextEnricher (`context_enricher.py`)

Internal module — not exported from `shared.logging`.

| Component | Responsibility |
|-----------|----------------|
| `ContextEnrichment` | Immutable snapshot of context fields for one log |
| `ContextEnricher` | Protocol with `enrich()` method |
| `DefaultContextEnricher` | Reads `ContextManager.get()` and copies fields |
| `validate_framework_metadata()` | Rejects reserved keys in caller metadata |

⸻

Context Fields

Enriched on every log when present in active `LogContext`:

* `correlation_id`, `request_id`
* `user_id`, `user_role`
* `patient_account_id`, `patient_profile_id`
* `consultation_id`, `encounter_id`
* `recommendation_id`, `booking_id`
* `laboratory_id`, `report_id`, `whatsapp_message_id`

Reserved field names are defined in `FRAMEWORK_CONTEXT_FIELDS` (`constants.py`).

⸻

LogRecord Extension

Context fields are top-level immutable attributes on `LogRecord`, applied via `enrich_record()` after `build_record()`.

⸻

JSON Formatter Policy

* Context fields appear after `timestamp` in JSON output.
* **Omit-null policy:** absent or empty context fields are not included in JSON.
* `schema_version` remains `1` (additive fields).

Example with active context:

```json
{
  "schema_version": 1,
  "timestamp": "2026-07-01T12:00:00.123456Z",
  "correlation_id": "550e8400-e29b-41d4-a716-446655440000",
  "request_id": "7f8a9b0c-1234-5678-9abc-def012345678",
  "booking_id": "BK123",
  "level": "INFO",
  "module": "booking",
  "action": "booking.created",
  "status": "SUCCESS",
  "message": "Booking created",
  "event_code": null,
  "metadata": {}
}
```

⸻

Developer Experience

**Correct — no tracing IDs in application code:**

```python
logger.info(
    "Booking created",
    module=LogModule.BOOKING,
    action="booking.created",
)
```

**Incorrect — reserved metadata keys raise `LoggingError`:**

```python
logger.info(..., metadata={"correlation_id": "manual"})  # rejected
```

Business services populate context fields via `ContextManager.update()` during request processing (not via logger metadata).

⸻

Error Handling

* No active context: log succeeds; context keys omitted from JSON.
* Invalid metadata with reserved keys: `LoggingError` before dispatch.
* Enrichment never raises for missing context.

⸻

Explicit Exclusions (M2.4)

* Celery propagation — see [16_Celery_Context_Propagation.md](16_Celery_Context_Propagation.md) (M2.5)
* Clinical/Business audit routing
* OpenTelemetry / distributed tracing

⸻

Acceptance Criteria

* Every log path auto-enriched via `ContextEnricher`
* `logger.py` has no `ContextManager` import
* Reserved metadata keys rejected
* Formatter omits null context fields
* Integration tests verify shared `correlation_id` across logs in one scope

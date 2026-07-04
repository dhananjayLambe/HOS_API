# DoctorProCare Shared Logging Platform

Production logging platform for DoctorProCare. **Milestone 7** certifies the M1–M6 platform for rollout across all modules.

## Certification policy

After M7, all DoctorProCare application code must use:

```python
from shared.logging import logger
```

Direct `import logging` is not permitted in application modules.

## Running the certification suite

```bash
# Unit + integration + sample catalog (required gate)
make test-logging

# Full certification with ≥95% coverage enforcement
make test-logging-certification

# Performance benchmarks (slow)
pytest shared/logging/tests/performance -m slow -v
```

## Test layout

```
shared/logging/tests/
├── conftest.py
├── unit/              # Component tests (145+)
├── integration/       # End-to-end pipelines + failure injection
├── performance/       # Benchmark certification
└── samples/           # Reference JSON catalog
```

## CloudWatch dev smoke check

Optional live validation against `/doctorprocare/dev/application`:

```bash
export CLOUDWATCH_VALIDATION=1
export AWS_REGION=ap-south-1
export CLOUDWATCH_LOG_GROUP=/doctorprocare/dev/application
python -m shared.logging.certification.cloudwatch_check
```

## Platform scope (M1–M6)

- Logger API, JSON formatter, configuration, exception framework
- Console + CloudWatch output handlers
- Handler-agnostic dispatch (failures never stop application workflows)

## Phase 2 — Correlation ID (M2.1)

Milestone 2.1 introduces the Correlation ID domain model in `shared/logging/correlation.py`. No runtime propagation, middleware, or logger changes yet.

**Purpose:** End-to-end workflow tracing identifier — globally unique, random UUID v4 with no embedded business or infrastructure data.

**Public API:**

```python
from shared.logging.correlation import (
    CorrelationId,
    generate_correlation_id,
    is_valid_correlation_id,
    parse_correlation_id,
)

# Generate a new Correlation ID
correlation_id = generate_correlation_id()
print(correlation_id.to_string())  # e.g. "550e8400-e29b-41d4-a716-446655440000"

# Parse and validate an incoming value
if is_valid_correlation_id(header_value):
    correlation_id = parse_correlation_id(header_value)
else:
    correlation_id = CorrelationId.generate()
```

**Design principles:**

- Immutable value object wrapping UUID v4 (never manipulate raw UUIDs in application code)
- Validation failures raise `LoggingError`
- No ContextVar, middleware, Django, or Celery in the correlation module itself

**Phase 2 roadmap:** M2.1–M2.6 Complete (Correlation Framework certified)

## Phase 2 — Automatic Context Enrichment (M2.4)

Every log is automatically enriched with the active request context. Application code does not change.

```python
from shared.logging import logger, LogModule

# Same call as before — context fields appear automatically when set
logger.info(
    "Booking created",
    module=LogModule.BOOKING,
    action="booking.created",
)
```

**How it works:**

```
logger → ContextEnricher (internal) → ContextManager → LogRecord → JSON
```

- The logger never calls `ContextManager` directly — only `ContextEnricher`
- Framework fields (`correlation_id`, `request_id`, `booking_id`, etc.) must **not** be passed in `metadata`
- Services populate business context via `ContextManager.update()` during request processing
- CLI/startup with no context: logging works; context keys are omitted from JSON

**Context field reference:** `correlation_id`, `request_id`, `user_id`, `user_role`, `patient_account_id`, `patient_profile_id`, `consultation_id`, `encounter_id`, `recommendation_id`, `booking_id`, `laboratory_id`, `report_id`, `whatsapp_message_id`

## Phase 2 — Celery Context Propagation (M2.5)

Active `LogContext` is propagated automatically across Celery tasks. No changes to `@shared_task` functions.

**How it works:**

```
before_task_publish / LogContextPropagationTask → headers → task_prerun → ContextManager
```

* Registered in `main/celery.py` via `register_celery_context_signals()` and `app.Task = LogContextPropagationTask`
* Header key: `doctorprocare_log_context` (flat JSON dict of context fields)
* M2.4 logger enrichment reads restored context inside tasks automatically
* Scheduled/beat tasks with no publisher context behave as today (no header injected)

## Phase 2 — Correlation Middleware (M2.3)

Every HTTP request initializes Correlation ID and Request ID automatically.

```python
# Wired in main/settings.py MIDDLEWARE
"shared.logging.middleware.CorrelationMiddleware"
```

* Reuses valid incoming `X-Correlation-ID`; generates a new one when absent or invalid
* Always generates a unique `X-Request-ID`
* Clears context after the response (no leakage between requests)
* Response headers include both IDs for client/support correlation

## Phase 2 — End-to-End Certification (M2.6)

The Correlation Framework is certified as the DoctorProCare tracing standard.

* Full patient diagnostic booking workflow preserves one Correlation ID from HTTP → Celery → WhatsApp → report upload
* Concurrent requests remain isolated
* CloudWatch reconstructs the workflow from a single Correlation ID search
* Golden traces: `shared_docs/architecture/production_logging/samples/`

## Architecture documentation

- [17_End_to_End_Correlation_Validation.md](../shared_docs/architecture/production_logging/17_End_to_End_Correlation_Validation.md)
- [16_Celery_Context_Propagation.md](../shared_docs/architecture/production_logging/16_Celery_Context_Propagation.md)

- [15_Logger_Context_Integration.md](../shared_docs/architecture/production_logging/15_Logger_Context_Integration.md)
- [14_Correlation_ID_Framework.md](../shared_docs/architecture/production_logging/14_Correlation_ID_Framework.md)
- [13_Logging_Platform_Certification.md](../shared_docs/architecture/production_logging/13_Logging_Platform_Certification.md)
- [12_Output_Handler_Framework.md](../shared_docs/architecture/production_logging/12_Output_Handler_Framework.md)
- [11_Exception_Framework.md](../shared_docs/architecture/production_logging/11_Exception_Framework.md)

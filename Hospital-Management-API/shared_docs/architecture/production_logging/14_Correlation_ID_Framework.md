14_Correlation_ID_Framework.md

DoctorProCare Correlation ID Framework

Document Type: Technical Design Specification

Version: 1.0

Status: Production Design

Related Documents

* [04_Correlation_Framework.md](04_Correlation_Framework.md) — platform-wide tracing specification
* [03_Logger_Framework.md](03_Logger_Framework.md)
* [10_Implementation_Plan.md](10_Implementation_Plan.md)

⸻

Purpose

Define the Correlation ID as a first-class immutable domain object in the DoctorProCare logging platform.

Milestone 2.1 establishes generation, validation, parsing, and serialization of Correlation IDs without integrating Django, middleware, Celery, or the logger. Runtime propagation begins in later Phase 2 milestones.

⸻

Architecture

```
Application / Future Middleware
        │
        ▼
CorrelationId.generate() / .parse()
        │
        ▼
Immutable CorrelationId
        │
        ▼
Validation + Serialization
        │
        ▼
Future Runtime Context (M2.2+)
```

The Correlation ID is independent of any transport mechanism.

⸻

Design Principles

* Correlation IDs are immutable value objects wrapping UUID v4.
* Application code must not manipulate raw UUIDs directly.
* Correlation IDs contain no patient, doctor, booking, or infrastructure data.
* No sequential IDs, timestamps, or embedded business information.
* Validation failures raise `LoggingError`.
* No global state, ContextVar, or caching in this module.

⸻

Module

`shared/logging/correlation.py`

⸻

Public API

**Class: `CorrelationId`**

| Method | Description |
|--------|-------------|
| `generate()` | Create a new random UUID v4 Correlation ID |
| `parse(value: str)` | Parse and validate a string |
| `from_uuid(uuid_value: UUID)` | Construct from a UUID instance |
| `validate(value)` | Validate without constructing; raises on failure |
| `to_string()` | Canonical lowercase hyphenated string |

**Module helpers**

| Function | Description |
|----------|-------------|
| `generate_correlation_id()` | Wrapper for `CorrelationId.generate()` |
| `is_valid_correlation_id(value)` | Returns `bool`; never raises |
| `parse_correlation_id(value)` | Wrapper for `CorrelationId.parse()` |

**Constants** (`shared/logging/constants.py`)

* `CORRELATION_ID_VERSION = 4`
* `CORRELATION_ID_LENGTH = 36`

⸻

Validation Rules

Accept:

* UUID version 4 strings (36 characters, hyphenated)

Reject (raises `LoggingError`):

* `None`
* Non-string inputs
* Empty or whitespace-only strings
* Malformed UUID strings
* UUIDs with unsupported versions (v1, v3, v5, nil)

⸻

Serialization

Round-trip identity is preserved:

```
CorrelationId → to_string() → parse() → CorrelationId
```

Equality compares underlying UUID values, not string formatting differences.

⸻

Examples

```python
from shared.logging.correlation import (
    CorrelationId,
    generate_correlation_id,
    is_valid_correlation_id,
    parse_correlation_id,
)

# Generate
correlation_id = generate_correlation_id()
canonical = correlation_id.to_string()

# Parse incoming value (e.g. future X-Correlation-ID header)
if is_valid_correlation_id(header_value):
    correlation_id = parse_correlation_id(header_value)
else:
    correlation_id = CorrelationId.generate()
```

⸻

Explicit Exclusions (M2.1)

* Request Context / ContextVar (`context.py` unchanged)
* Django middleware
* Logger / formatter modifications
* Celery propagation
* Clinical Audit, Business Audit, CloudWatch

⸻

Phase 2 Roadmap

| Milestone | Scope |
|-----------|-------|
| **2.1** Correlation ID Foundation | `correlation.py` — this document |
| **2.2** Request Context Framework | `context.py` — ContextVar lifecycle |
| **2.3** Django Correlation Middleware | Thin orchestrator delegating to M2.1/M2.2 |
| **2.4** Logger Integration | `context_enricher.py` — ContextEnricher auto-injection | Complete — see [15_Logger_Context_Integration.md](15_Logger_Context_Integration.md) |
| **2.5** Celery Propagation | Restore context across async tasks |

⸻

Future Log Shape (M2.4)

```json
{
  "timestamp": "...",
  "correlation_id": "550e8400-e29b-41d4-a716-446655440000",
  "level": "INFO"
}
```

Logs include context fields automatically when an active `LogContext` is set (M2.4). Middleware (M2.3) will populate context on every HTTP request.

⸻

Acceptance Criteria

Milestone 2.1 is complete when:

* `correlation.py` provides an immutable `CorrelationId` value object.
* UUID v4 generation, parsing, validation, serialization, and equality are implemented.
* `constants.py` defines correlation constants without runtime logic.
* `context.py`, `logger.py`, `formatter.py`, `handlers.py`, and `dispatcher.py` are unchanged.
* Unit tests achieve full coverage of `correlation.py`.

17_End_to_End_Correlation_Validation.md

DoctorProCare End-to-End Correlation Framework Validation & Certification

Document Type: Certification Specification

Version: 1.0

Status: Certified

Phase: Phase 2 – Correlation Framework

Milestone: 2.6

Related Documents

* [04_Correlation_Framework.md](04_Correlation_Framework.md)
* [14_Correlation_ID_Framework.md](14_Correlation_ID_Framework.md)
* [15_Logger_Context_Integration.md](15_Logger_Context_Integration.md)
* [16_Celery_Context_Propagation.md](16_Celery_Context_Propagation.md)
* [samples/cloudwatch_search_examples.md](samples/cloudwatch_search_examples.md)

⸻

Purpose

Certify that a single Correlation ID is preserved across the complete DoctorProCare workflow.

No new framework functionality is introduced in M2.6. This milestone proves that M2.1–M2.5 behave as one distributed tracing platform before Clinical Audit, Business Audit, and Support Trace Index are implemented.

⸻

Validation Architecture

```
HTTP Request
      │
      ▼
CorrelationMiddleware (M2.3)
      │
      ▼
Request Context (M2.2)
      │
      ▼
Logger + ContextEnricher (M2.4)
      │
      ▼
JSON Formatter → Console / CloudWatch
      │
      ▼
Celery Propagation (M2.5)
      │
      ▼
Worker Logger (same Correlation ID)
      │
      ▼
CloudWatch reconstruction
```

⸻

Certification Workflow

Patient diagnostic booking journey (golden trace):

```
Authentication
→ Recommendation Engine
→ Diagnostic Booking
→ Booking Confirmation
→ Celery Task
→ WhatsApp Notification
→ Laboratory Processing
→ Report Upload
→ Patient Notification
→ Workflow Completed
```

Every step must contain the same immutable Correlation ID.

Golden artifacts:

* [samples/patient_booking_trace.json](samples/patient_booking_trace.json)
* [samples/celery_trace.json](samples/celery_trace.json)
* [samples/report_upload_trace.json](samples/report_upload_trace.json)

Golden Correlation ID: `550e8400-e29b-41d4-a716-446655440000`

⸻

Validation Layers

| Layer | Component | Assertion |
|-------|-----------|-----------|
| 1 | HTTP / Middleware | Exactly one Correlation ID and Request ID per request |
| 2 | API logs | Every log includes both IDs |
| 3 | Business services | Recommendation, Booking, Laboratory, Reports share Correlation ID |
| 4 | Celery | Worker logs inherit Correlation ID; retries preserve it |
| 5 | WhatsApp | Queue, send, and patient notification share Correlation ID |
| 6 | Report upload | Start → complete → notify share Correlation ID |
| 7 | CloudWatch | Single Correlation ID search reconstructs the full timeline |

⸻

Context Rules

* **Correlation ID** never changes within a workflow.
* **Request ID** is unique per HTTP request; Celery inherits the publisher Request ID.
* Invalid incoming `X-Correlation-ID` is rejected (a new valid ID is generated).
* Missing context does not prevent logging (CLI / startup).
* Concurrent requests never share or leak context.
* Failed and retried Celery tasks preserve Correlation ID in logs; context is cleared after completion.

⸻

Integration Tests

| File | Coverage |
|------|----------|
| `tests/unit/test_middleware.py` | Middleware generate / reuse / reject / cleanup |
| `tests/integration/test_http_trace.py` | Layers 1–2, middleware performance |
| `tests/integration/test_celery_trace.py` | Layer 4, retry, failure |
| `tests/integration/test_cloudwatch_trace.py` | CloudWatch JSON, searchability, exceptions |
| `tests/integration/test_complete_workflow.py` | Full patient journey + enrichment budget |
| `tests/integration/test_concurrent_requests.py` | Isolation under concurrency |

Run:

```bash
make test-logging-certification
```

⸻

Performance Targets

| Check | Target | Certification test |
|-------|--------|--------------------|
| Middleware per request | < 1 ms | `test_middleware_overhead_under_one_millisecond` |
| Log path with enrichment | < 2 ms (includes full dispatch) | `test_correlation_enrichment_overhead_under_target` |

Enrichment itself is a ContextVar read and field copy; the measured path includes formatting and handler emit.

⸻

Correlation Certification Checklist

Confirm each item before promoting Phase 3 (Clinical Audit):

- [x] Every HTTP request generates exactly one Correlation ID
- [x] Valid incoming `X-Correlation-ID` is reused
- [x] Invalid incoming Correlation ID is rejected (new ID generated)
- [x] Every log in the workflow contains that Correlation ID
- [x] Request IDs are unique per HTTP request
- [x] Context is cleaned up after each request
- [x] Celery preserves the Correlation ID across tasks, retries, and failures
- [x] CloudWatch reconstructs the workflow from a single Correlation ID search
- [x] Concurrent requests remain isolated
- [x] Missing context does not break the logger
- [x] Golden sample traces are published for developers and support
- [x] `make test-logging-certification` passes with ≥95% coverage

**Certification status: PASSED**

⸻

Troubleshooting

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| Logs missing `correlation_id` | Middleware not installed or context cleared early | Confirm `CorrelationMiddleware` is in `MIDDLEWARE` |
| Celery logs lack Correlation ID | Signals not registered | Confirm `register_celery_context_signals()` in `main/celery.py` |
| Different Correlation IDs in one workflow | Manual ID creation in business code | Never create Correlation IDs outside middleware |
| Context leak between requests | Missing `finally: clear()` | Middleware always clears in `finally` |
| CloudWatch incomplete timeline | Buffer not flushed / wrong log group | Flush handlers on shutdown; search correct log group |

⸻

Explicit Exclusions

* Clinical Audit
* Business Audit
* Support Trace Index
* Monitoring dashboards
* OpenTelemetry / multi-service distributed tracing

⸻

Acceptance Criteria

* Complete patient workflow executed from HTTP through background processing
* Every log shares one immutable Correlation ID
* Request IDs unique per HTTP request; Correlation ID constant across the workflow
* Propagation verified through Django, services, Celery, and notifications
* CloudWatch reconstructs the workflow via one Correlation ID search
* Concurrent requests do not leak context
* Failures and retries preserve Correlation IDs
* Integration tests and golden samples published
* Correlation Framework formally certified as the DoctorProCare tracing standard

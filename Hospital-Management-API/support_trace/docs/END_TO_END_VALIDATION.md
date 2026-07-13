# End-to-End Validation (M5.9)

Golden scenarios in `support_trace/tests/certification/test_end_to_end.py`.

## Scenario 1 — Booking workflow

1. Index booking trace with identifiers
2. `TraceLookupService.lookup_by_workflow`
3. `TimelineService.build_workflow_timeline`
4. REST `GET /api/v1/support/workflow/{id}?expand=runtime`
5. `CertificationService.run()` with API envelope

## Scenario 2 — Failed WhatsApp delivery

1. `setup_booking_chain(whatsapp_failed=True, retry_count=2)`
2. Incident reconstruction + certification
3. Validates failure/retry analyzers

## Scenario 3 — Correlation multi-trace

1. Two traces sharing `correlation_id`
2. `SupportTraceRepository.get_by_correlation`
3. Identifier + integrity certification

## Running tests

```bash
DJANGO_SETTINGS_MODULE=main.settings_test .venv/bin/python -m pytest support_trace/tests/certification/test_end_to_end.py -v
```

## Programmatic certification

```python
from support_trace.certification import CertificationService

report = CertificationService.run(
    workflow_id=wf_id,
    booking_id=booking_id,
    correlation_id=corr_id,
)
assert report.certification_status in ("PASS", "WARN")
```

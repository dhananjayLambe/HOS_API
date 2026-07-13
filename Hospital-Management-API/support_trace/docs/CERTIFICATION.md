# Platform Certification (M5.9)

M5.9 orchestrates **platform-level** validation across all Support Trace engines (M5.1–M5.8). It does not replace per-engine `certification.py` modules — it delegates to them.

## CertificationService

Single entry point:

```python
from support_trace.certification import CertificationService

report = CertificationService.run(
    scope="platform",
    workflow_id=wf_id,
    booking_id=booking_id,
    correlation_id=corr_id,
    api_envelope=response.data,  # optional M5.6 envelope check
    include_performance=True,
)
```

## Validator pipeline

1. `WorkflowValidator` — indexed traces, correlation, parent links
2. `IdentifierValidator` — golden booking/correlation lookups
3. `TimelineValidator` — delegates to `TimelineCertification`
4. `LookupValidator` — delegates to `InvestigationCertification`
5. `IncidentValidator` — delegates to `IncidentCertification`
6. `RuntimeValidator` — `runtime_metadata`, CloudWatch URL format
7. `CloudWatchValidator` — link builder consistency
8. `ApiValidator` — M5.6 envelope schema
9. `IntegrityValidator` — orphans, duplicates
10. `PerformanceValidator` — soft SLA asserts

## Report

`SupportTraceCertificationReport` includes per-category scores, `certification_status` (`PASS` / `WARN` / `FAIL`), warnings, and `duration_ms`.

All certification is **fail-open** via `fail_open_certification`.

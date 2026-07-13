# Lookup APIs

Public methods on `TraceLookupService` — all return `TraceLookupResult`.

## Universal

- `investigate(raw, *, level, options, policy, filters)` — AI entry point
- `lookup_any(raw)` — auto-detect identifier
- `lookup_many(ids, *, parallel=True)` — batch with dedupe

## Typed lookups

- `lookup_by_patient` / `lookup_by_patient_account`
- `lookup_by_consultation` / `lookup_by_encounter`
- `lookup_by_booking` / `lookup_by_recommendation` / `lookup_by_routing`
- `lookup_by_report` / `lookup_by_prescription`
- `lookup_by_payment` / `lookup_by_invoice`
- `lookup_by_whatsapp` / `lookup_by_phone`
- `lookup_by_provider_reference`
- `lookup_by_workflow` / `lookup_by_correlation`

## Parameters

```python
from support_trace.lookup import TraceLookupService, InvestigationLevel, InvestigationOptions, InvestigationPolicy

TraceLookupService.lookup_by_booking(
    booking_id,
    level=InvestigationLevel.STANDARD,
    policy=InvestigationPolicy.for_patient_investigation(),
)
```

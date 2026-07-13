# Trace Lookup Examples

## Booking investigation

```python
from support_trace.lookup import TraceLookupService

result = TraceLookupService.lookup_by_booking("550e8400-e29b-41d4-a716-446655440000")
print(result.summary.structured.current_status)
print(result.summary.structured.next_expected_step)
for event in result.timeline.events:
    print(event.timeline_sequence, event.event)
```

## WhatsApp message

```python
result = TraceLookupService.lookup_by_whatsapp("wamid.HBgL...")
print(result.primary_trace.workflow_type)
print(result.summary.narrative.text)
```

## Correlation timeline + audits

```python
result = TraceLookupService.lookup_by_correlation(correlation_id)
print(len(result.clinical_audits), len(result.business_audits))
print(result.statistics.timeline_events)
```

## Patient (multi-workflow)

```python
from support_trace.lookup import InvestigationPolicy

result = TraceLookupService.lookup_by_patient(
    patient_account_id,
    policy=InvestigationPolicy.for_patient_investigation(),
)
print(result.identifier_lookup.trace_count)
```

## Batch lookup

```python
results = TraceLookupService.lookup_many([id1, id2, id3], parallel=True)
```

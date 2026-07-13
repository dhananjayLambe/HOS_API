# Timeline Engine

M5.4 ships the read-only Timeline Aggregation Engine — the historical projection layer for production support.

## Architecture

```
Clinical Audit (immutable)
Business Audit (immutable)
Support Trace (current state)
        │
TimelineRepository.fetch_bundle()
        │
ClinicalAdapter / BusinessAdapter
        │
TimelineMerger → TimelineSorter → TimelineGraph → Snapshot → Statistics → Filter
        │
TimelineResult
```

Timeline **never writes** to audit tables or SupportTrace.

## Public API

```python
from support_trace.timeline import TimelineService

result = TimelineService.build_correlation_timeline(correlation_id)
result = TimelineService.build_patient_timeline(patient_account_id)
result = TimelineService.build_booking_timeline(booking_id)
result = TimelineService.build_workflow_timeline(workflow_instance_id)
```

## Source adapters

| Adapter | Role |
|---------|------|
| `ClinicalAdapter` | Clinical Audit → `TimelineEvent` |
| `BusinessAdapter` | Business Audit → `TimelineEvent` |
| `SupportTraceAdapter` | Enrichment metadata only (no history events) |
| `CloudWatchAdapter` | Stub for M5.8 |

## Pipeline order

1. `TimelineResolver.resolve(scope)`
2. `TimelineRepository.fetch_bundle(scope)`
3. Adapters project rows
4. Merge + sort + assign `timeline_sequence`
5. Build `TimelineGraph` (workflow tree)
6. Build `WorkflowSnapshot` list with computed health
7. Compute statistics (after grouping)
8. Apply optional `TimelineFilter`
9. Certification validators (fail-open)

## M5.5+ alignment

M5.5 Trace Lookup and M5.6 REST APIs delegate to `TimelineService` — no duplicate aggregation logic.

See also: [TIMELINE_ADAPTERS.md](TIMELINE_ADAPTERS.md), [TIMELINE_EVENT.md](TIMELINE_EVENT.md), [TIMELINE_EXAMPLES.md](TIMELINE_EXAMPLES.md).

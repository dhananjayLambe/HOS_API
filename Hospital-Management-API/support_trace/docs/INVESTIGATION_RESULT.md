# TraceLookupResult

Unified investigation response from `TraceLookupService`.

## Core fields

| Field | Description |
|-------|-------------|
| `identifier_lookup` | M5.3 `IdentifierLookupResult` |
| `primary_trace` | Focus workflow |
| `primary_snapshot` | Current state projection |
| `timeline` | `InvestigationTimeline` wrapper over M5.4 |
| `clinical_audits` / `business_audits` | Raw audit rows |
| `workflow_graph` | M5.4 `TimelineGraph` with `to_tree()` |
| `identifiers` | Merged identifier collection |
| `health` | Multi-dimension `HealthAssessment` |
| `summary` | `StructuredSummary` + `NarrativeSummary` |
| `statistics` | Dashboard metrics |
| `error_classification` | Business/Technical/Provider/… |
| `duration_ms` | Build time |

## Usage

```python
result = TraceLookupService.lookup_by_booking(booking_id)
print(result.summary.narrative.text)
print(result.workflow_graph.to_tree())
print(result.health.overall)
```

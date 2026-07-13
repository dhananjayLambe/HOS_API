# Timeline Adapters

Source adapters keep the Timeline Engine extensible without a monolithic builder.

## Protocol

```python
class TimelineSourceAdapter(Protocol):
    source_type: str
    def adapt(row, *, registry=EventRegistry) -> TimelineEvent | None
    def adapt_many(rows) -> list[TimelineEvent]
```

## Implementations

| Adapter | File | M5.4 status |
|---------|------|-------------|
| `ClinicalAdapter` | `adapters/clinical_adapter.py` | Complete |
| `BusinessAdapter` | `adapters/business_adapter.py` | Complete |
| `SupportTraceAdapter` | `adapters/support_trace_adapter.py` | Enrichment only |
| `CloudWatchAdapter` | `adapters/cloudwatch_adapter.py` | Stub (M5.8) |

## Adding a new source

1. Create `adapters/my_source_adapter.py` implementing the protocol.
2. Register actions in `event_registry.py` if applicable.
3. Extend `TimelineRepository.fetch_bundle()` to read the new source.
4. Call adapter from `TimelineEngine` — no changes to `TimelineService`.

Future: OpenTelemetry, payment webhooks, AI incident events.

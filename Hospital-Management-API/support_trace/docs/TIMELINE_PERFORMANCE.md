# Timeline Performance

## Targets

| Scenario | Target |
|----------|--------|
| 100 events | <100 ms |
| 1000 events | <200 ms |
| Full build | <500 ms |

## Design choices

- Single `fetch_bundle(scope)` batch read per source type
- In-memory merge/sort/filter — no timeline persistence
- Indexed audit queries via existing repository methods
- `build_duration_ms` recorded on every `TimelineResult`

## Complexity

- Merge/sort: O(n log n) where n = clinical + business events
- Graph build: O(t + e) where t = traces, e = events
- Relationship expansion: delegated to M5.3 `RelationshipResolver`

## Future optimization (out of M5.4)

- Caching (M5.7)
- OpenSearch timeline index (M5.6+)

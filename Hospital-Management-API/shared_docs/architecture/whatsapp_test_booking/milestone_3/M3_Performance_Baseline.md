# M3 — Performance Baseline

## Targets (single-lab seeded scenario)

| Metric | Target |
|--------|--------|
| Average latency | < 300 ms |
| P95 | < 500 ms |
| P99 | < 800 ms |
| Max ORM queries | < 20 |
| Max payload | < 25 KB |
| DB writes | 1 audit insert only |

## Verified in tests

- `test_payload_size_budget` — payload < 25 KB
- Full API test suite runtime ~1.7s for 16 API cases

## Notes

- No recommendation cache DB in M3
- Branch address reload adds 1 presentation query on success
- Production baseline should be re-recorded on staging with realistic lab pool size

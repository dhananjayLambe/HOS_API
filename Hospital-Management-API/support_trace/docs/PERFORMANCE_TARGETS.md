# Performance Targets (M5.9)

Soft SLA targets for Support Trace operations. CI tests use **5× tolerance** (same pattern as incident performance tests).

| Operation | Target (ms) | Module |
|-----------|-------------|--------|
| Search | 100 | `lookup/` |
| Lookup | 150 | `lookup/` |
| Timeline | 200 | `timeline/` |
| Incident reconstruction | 350 | `incident/` |
| Runtime link build | 20 | `runtime/` |
| API response | 300 | `api/` |

## Enforcement

`PerformanceValidator` in `support_trace/certification/performance_validator.py` runs soft asserts during `CertificationService.run(include_performance=True)`.

Constants:

- `support_trace/incident/constants.py` — `PERFORMANCE_TARGETS_MS`
- `support_trace/runtime/constants.py` — `PERFORMANCE_TARGET_RUNTIME_LINK_MS`

Failures produce warnings and reduce `performance_score` — they do not block trace writes.

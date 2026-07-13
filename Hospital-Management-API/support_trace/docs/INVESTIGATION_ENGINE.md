# Investigation Engine (M5.5)

M5.5 is the **Support Investigation Engine** — the canonical read path for production support. It orchestrates M5.3 identifier resolution, M5.4 timeline aggregation, and SupportTrace state into a single `TraceLookupResult`.

## Architecture

```
TraceLookupService.investigate() / lookup_by_*()
  → InvestigationEngine.investigate(InvestigationContext)
  → InvestigationPolicy (depth, limits, masking)
  → IdentifierLookupService (M5.3)
  → TimelineRepository.fetch_bundle + TimelineEngine.build_from_bundle (M5.4)
  → SummaryBuilder, HealthBuilder, StatisticsBuilder
  → TraceLookupResult
```

## Key components

| Module | Role |
|--------|------|
| `lookup_service.py` | Public API |
| `investigation_engine.py` | Pipeline orchestration |
| `investigation_policy.py` | Expansion depth, limits, PII masking |
| `identifier_lookup.py` | M5.3 delegate |
| `timeline_lookup.py` | M5.4 delegate (single bundle fetch) |
| `summary_builder.py` | Structured + narrative summaries |
| `health_builder.py` | Multi-dimension health assessment |
| `report_builder.py` | JSON / Markdown export |

## No new persistence

Investigation is **read-only**. No new tables, no writes to audit or SupportTrace.

## Investigation levels

| Level | Payload |
|-------|---------|
| `BASIC` | Primary trace + summary |
| `STANDARD` | + timeline, health, identifiers |
| `FULL` | Everything (default) |
| `DEEP` | FULL + report export hooks (M5.8/AI stubs) |

## Future consumers

M5.6 REST APIs, M5.7 UI, M5.8 CloudWatch, and AI assistants must call `TraceLookupService` only.

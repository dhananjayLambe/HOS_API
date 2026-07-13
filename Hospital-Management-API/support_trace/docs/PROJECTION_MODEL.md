# Projection Model

Support Trace is a **CQRS read model / event projection**, not an audit store.

```
Application
  → Structured Logging + Correlation
  → Clinical Audit (immutable)
  → Business Audit (immutable)
  → ProjectionEngine
  → Support Trace (mutable projection)
  → Search / Timeline / CloudWatch (M5.4+)
```

## ProjectionEvent

`SupportTraceSyncEvent` is the sole intermediate between audits and the engine.

- Factories: `from_business_audit`, `from_clinical_audit`
- `to_serializable()` / `from_serializable()` for M5.3 rebuild stubs

## ProjectionEngine

Routes SyncEvents to consumers. M5.2: `WorkflowSyncService` only. Later: search index, analytics, CloudWatch.

## Versions

| Field | Purpose |
|-------|---------|
| `trace_version` | Per-row optimistic concurrency |
| `projection_version` | Projection logic version (`PROJECTION_VERSION` constant) |

Bump `PROJECTION_VERSION` when duration/snapshot/registry logic changes; M5.3 rebuild upgrades rows.

## current_snapshot

Latest-only JSON for support (not history). May include `booking_status`, `assigned_lab`, `current_channel`, `retry_count`, `retry_reason`.

## Rebuild

M5.3 replays audits through the same SyncEvent → ProjectionEngine path. `bulk_upsert()` is ready for batch rebuild.

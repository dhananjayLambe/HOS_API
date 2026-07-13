# Projection Model

## Core principle

Support Trace is a **projection**, not an audit table.

- `SupportTrace` rows are **always rebuildable** from Clinical Audit + Business Audit if corrupted or lost.
- Never store audit payloads; store references (`last_clinical_audit_id`, `last_business_audit_id`) and indexed identifiers only.
- The immutable audit layers remain the sole source of truth for *what happened*.

## Rebuildability

If a projection row is missing, stale, or corrupted:

1. Query immutable audit history by `workflow_instance_id` or `correlation_id`.
2. Replay events in `sequence_no` / timestamp order.
3. Emit `SupportTraceSyncEvent` for each audit record (M5.2 hooks).
4. `ProjectionEngine.project()` upserts the projection row.

Because each upsert is keyed by `workflow_instance_id` and validated for sequence monotonicity, replay produces a consistent final state.

## `projection_version`

| Field | Default | Purpose |
|-------|---------|---------|
| `projection_version` | `1` | Tracks which projection logic produced the row |

When projection logic changes (new identifier fields, different health derivation, fingerprint algorithm update):

1. Increment the global `projection_version` constant.
2. Run a full re-index job (M5.3) that replays all audit events.
3. Rows with mismatched `projection_version` can be identified and rebuilt without ambiguity.

M5.1 sets `projection_version = 1` on every create/update. No rebuild job exists yet.

## `workflow_fingerprint`

Deterministic identity independent of database PKs:

```
SHA256(workflow_instance_id | workflow_type | resource_id | organization_id)
→ "sha256:<hex_digest>"
```

Used for:

- Integrity checks during rebuild
- Deduplication across disaster recovery
- Future event-sourcing alignment

Computed in `SupportTraceBuilder`; stored on every row. See `domain/fingerprint.py`.

## `trace_version`

Optimistic concurrency counter. Incremented on every successful update. Not related to `projection_version`:

| Field | Scope | Purpose |
|-------|-------|---------|
| `trace_version` | Per row | Concurrent write protection |
| `projection_version` | Global logic version | Safe rebuild after logic changes |

## Sync metadata

Projection health is visible without CloudWatch:

| Field | Values | Meaning |
|-------|--------|---------|
| `sync_status` | Pending / Indexed / Failed / Retry | Indexing state |
| `last_source` | ClinicalAudit / BusinessAudit / Manual / System | Origin of latest update |
| `last_sequence_no` | int | Mirrors Business Audit `sequence_no` |

When Business Audit succeeds but Support Trace indexing fails: `sync_status = Failed`. Audit history remains intact; projection can be retried or rebuilt.

M5.1 sets `sync_status = Indexed` on successful `record()`. Failed paths return `SupportTraceResult(sync_status=Failed)`.

## What is NOT stored

- Audit payloads or snapshots
- Full event history (that lives in Clinical/Business Audit)
- CloudWatch log references (M5.8)

## Production rules

1. **No `delete()`** on the production repository API.
2. **No immutability queryset** — rows are upserted in place.
3. **No direct service calls** from production modules after M5.2 — use sync hooks and `ProjectionEngine`.

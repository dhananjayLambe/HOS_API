# ADR-011 — Measurement-First Workspace Performance Hardening

## Status

Accepted (Milestone 11)

## Context

Doctor Report Workspace APIs (list, search, summary, detail, preview, download) were functionally complete. Production readiness required bounded SQL, no N+1, and indexes justified by real predicates—not speculative single-column indexes.

## Decision

1. Optimize only in the repository (and owning-model migrations in `diagnostics_engine`).
2. Lock hard query budgets in tests for every workspace read path.
3. Ship indexes only after `EXPLAIN (ANALYZE, BUFFERS)` shows a usable Index Scan / Index Cond for the target predicate (documented in [PERFORMANCE.md](../PERFORMANCE.md)).
4. Freeze DTOs, HTTP contracts, and clinical/filter semantics.

## Consequences

- Count paths no longer pay for unused joins.
- Detail/preview/download share one scoped artifact loader.
- Search `report_number` and awaiting `(status, updated_at)` scale with dedicated indexes.
- Caching, OpenSearch, and denormalization remain explicitly deferred.

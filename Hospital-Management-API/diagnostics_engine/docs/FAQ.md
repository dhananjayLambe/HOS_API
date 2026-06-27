---
owner: diagnostics_engine-team
module: diagnostics_engine
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# FAQ — diagnostics_engine

## When are test lines created?

At order **confirm**, not at cart creation. See [WORKFLOWS.md](WORKFLOWS.md).

## Can package price equal sum of tests?

No requirement — package is a SKU price (ADR-002). Derived sum only if `DIAGNOSTICS_ALLOW_DERIVED_PACKAGE_PRICING=True`.

## Where to upload lab reports?

`POST /api/v1/diagnostics/reports/{report_id}/artifacts/upload/` — use `report_id`, not assignment `task_id`.

## What if no lab is available?

Routing sets `no_match_found` and stores reject snapshots (up to `DIAGNOSTIC_ROUTING_MAX_REJECT_SNAPSHOTS`).

## Catalog import commands?

See `management/commands/CATALOG_IMPORT_COMMANDS.txt` and `sync_diagnostic_*` commands.

## Legacy vs v1 report APIs?

Prefer `/api/v1/diagnostics/` operational routes; `/api/diagnostics/` legacy paths deprecated for new work.

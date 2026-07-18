# Performance — Doctor Report Workspace (Milestone 11)

Measurement-first hardening. APIs, DTOs, and business rules are frozen.

## Performance Rule

> Performance optimizations belong exclusively in the repository layer (and owning-app index migrations). Services must never optimize by issuing extra SQL; mappers must never trigger lazy loading; views remain unaware of ORM techniques. Every index or query-shape change must preserve API contracts and be backed by measurable evidence (query budgets and/or `EXPLAIN`).

## Budgets (acceptance)

| Path | Target SQL (repo read) |
|------|------------------------:|
| List / filtered list | ≤ 3 (measured **1**) |
| Search | ≤ 3 (measured **1**) |
| Summary (`count_reports` + `count_pending_uploads`) | ≤ 2 |
| Awaiting queue | ≤ 3 (measured **1**) |
| Detail / Preview / Download | ≤ 2 (report + artifact Prefetch) |

Profiler: `python manage.py profile_workspace_performance --seed 150`

## Before → after (local PostgreSQL, seed ≈ 150 ready reports)

| Path | Before (pre-M11 shape) | After (M11) |
|------|------------------------|-------------|
| List | 1 query | 1 query (~70 ms @150) |
| Search (report # prefix) | 1 query | 1 query (~49 ms) |
| Awaiting | 1 query (unbudgeted in tests) | 1 query + hard test |
| `count_*` | 1 each, **with** unused `select_related` joins | 1 each, **without** hydrate joins (~2–3 ms) |
| Detail / preview / download | 2 each (duplicated loaders) | 2 each via shared `_scoped_report_with_active_artifacts` |

## Repository ORM changes

1. **`hydrate=False` on count paths** — `count_reports` / `count_pending_uploads` skip `select_related`.
2. **Shared access loader** — detail / preview / download share Prefetch + scope; detail keeps deep `select_related` + `_has_artifact`; access paths keep thin `order_test_line__order`.
3. **Awaiting** — `AWAITING_SELECT_RELATED` covers mapper graph; budget locked in tests.

## Indexes shipped (`diagnostics_engine`)

Migrations: `0019_workspace_m11_performance_indexes`, `0020_workspace_m11_report_number_upper_idx`.

| Index | Table | Rationale / EXPLAIN evidence |
|-------|-------|------------------------------|
| `diag_line_stat_upd_idx` `(status, updated_at)` | `DiagnosticOrderTestLine` | Awaiting: `Index Cond` on status **and** `updated_at` (`Index Scan Backward` when bitmapscan disabled). Replaces filter-only use of status-only index for cursor range. |
| `diag_rpt_num_up_pat_idx` `OpClass(Upper(report_number), varchar_pattern_ops)` | `DiagnosticTestReport` | Django `iexact`/`istartswith` emit `upper(report_number) LIKE …`. Plain btree unused; functional pattern index → `Index Scan using diag_rpt_num_up_pat_idx`. |
| `diag_rpt_super_del_idx` `(supersedes, deleted_at)` | `DiagnosticTestReport` | Active-head anti-join / supersession Exists. |
| `diag_rpt_del_up_idx` `(deleted_at, uploaded_at)` | `DiagnosticTestReport` | Soft-delete + chronological support alongside existing `uploaded_at` index. |

**Skipped:** encounter `(clinic_id, doctor_id)` — list already uses `clinic_id` index; OR doctor scope did not show a clear composite win at measured volume.

**Note:** At N≈150 the planner may still prefer Seq Scan / status-only bitmap indexes. Evidence above used `enable_seqscan=off` (and for awaiting, `enable_bitmapscan=off`) to confirm the new indexes are **usable** for the target predicates; they become preferred as cardinality grows.

## How to re-measure

```bash
python manage.py profile_workspace_performance --seed 150 --awaiting 30
python manage.py test doctor_report_workspace.tests.test_workspace_performance --keepdb
```

# Reports UI — API Integration Readiness

Canonical implementation reference for the CTO-aligned operational frontend architecture.

## Production runtime

- Route: `/lab-dashboard/reports/` → `ReportsCompletionPage` (live v1 queue + completion cards)
- Data: `resolveReportsQueueProvider()` → `liveQueueProvider` (default) or `demoQueueProvider` (`?demo=1`)
- Hook: `useReportsOperationalQueue` — **no demo imports inside the hook**
- Mutations: `useReportsCompletionActions` → `useReportMutations` + query invalidation (server truth wins)
- View models only in UI: `OrderLifecycleViewModel` via `fallbackOrderFromTask` / `buildOrderLifecycleFromTaskContext`

## QA / dev flags

| Flag | Behavior |
|------|----------|
| *(default)* | Live API only — no demo chip, no Live/Mock toggle |
| `?demo=1` | Fixture queue via `demoQueueProvider` (QA / layout regression) |
| `?legacy=1` | Old `ReportsListPage` row layout (temporary) |
| `NEXT_PUBLIC_LAB_REPORTS_DATA_SOURCE_TOGGLE=true` | Show Live/Mock toggle on reports page |
| `NEXT_PUBLIC_LAB_REPORTS_DEMO=true` | Force fixtures without URL flag (avoid for live work) |
| `NEXT_PUBLIC_LAB_REPORTS_USE_V1_API=false` | Orders-list fallback loader (avoid in prod) |

Upload redirect (`/lab-dashboard/reports/upload/`) preserves `?demo=` only when present; it does **not** append `demo=1` by default.

## Phase 1 operator workflow

Upload → Ready for delivery → Delivered. `MARK_READY` is not shown as a separate operator step (`PHASE1_HIDE_MARK_READY_UI`).

## Operational filters (completion queue)

- **Search:** `?q=` server-side; keywords `pending`, `ready`, `failed`, `urgent`/`stat`, `tat`/`breach`, `tat30` set client filters deterministically.
- **Workflow (client):** All, Pending Upload, Ready Delivery, Delivered, Failed — KPI strip clicks set workflow.
- **Date (client, default Today):** filters on `operationalUpdatedAtIso` (proxy: `delivered_at ?? ready_at ?? uploaded_at` on queue DTO). API fetch still uses a **wide** `date_from`/`date_to` on assignment `assigned_at` so older pending rows are not dropped from the 50-item page.
- **URL params:** `workflow`, `date`, `from`, `to`, `urgent`, `tat`, `tat30`, `q`
- **Future:** `GET /report-tasks?date_range=today` on report `updated_at` (backend).

Key modules: `reports-queue-filters.ts`, `ReportsOperationalFilterBar.tsx`, `ReportsActiveFilterChips.tsx`.

## Manual parity checklist

- [ ] Default route loads live API (no demo banner)
- [ ] Expand patient group → multi-test lines from context API
- [ ] Upload / re-upload opens upload route with correct `reportId`
- [ ] Send / retry use `available_action_targets`
- [ ] Preview uses `buildQuickPreviewTarget` (live) — no placeholder assets
- [ ] Queue poll failure shows stale banner; refresh recovers
- [ ] `?demo=1` shows demo chip and fixture data only
- [ ] `?legacy=1` shows list escape hatch

## Key modules

- `lib/labs/reports/completion/queue-providers/`
- `lib/labs/reports/completion/action-fallback.ts`
- `lib/labs/reports/completion/fallback-order-from-task.ts`
- `hooks/labs/useReportsOperationalQueue.ts`
- `lib/labs/reports/build-quick-preview-target.ts`

See also [PHASE_6_REPORT_QUEUE_LIVE_INTEGRATION.md](../../integration/PHASE_6_REPORT_QUEUE_LIVE_INTEGRATION.md).

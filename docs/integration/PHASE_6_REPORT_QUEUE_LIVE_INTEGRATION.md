# Phase 6 — Report Queue Live Integration

## Environment

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_LAB_REPORTS_USE_V1_API` | Default **on**; set `false` to use legacy labs/orders path |
| `BACKEND_PROXY_TARGET=http://127.0.0.1:8000` | Django for Next `/api` rewrites (see `.env.local.example`) |
| `NEXT_PUBLIC_LAB_REPORTS_DEMO=true` or `?demo=1` | Optional demo fixtures only (not used in normal queue) |

Copy [`Hospital-Web-UI/medixpro/medixpro/.env.local.example`](Hospital-Web-UI/medixpro/medixpro/.env.local.example) to `.env.local` and restart `npm run dev`.

Next.js rewrites ` /api/v1/diagnostics/*` → Django backend (`next.config.mjs`).

## Contract checklist

- [x] Envelope: `{ success, request_id, data, error }`
- [x] Queue: single page `page_size=50`, no client cursor chaining on poll
- [x] Queue card: `available_action_targets` (upload/mark-ready/WhatsApp report ids, retry log id)
- [x] Upload: `POST reports/{report_id}/artifacts/upload/` multipart (`files`, `primary_file_index`, `notes`, `version`)
- [x] Mark ready / retry / detail on `report_id` / `log_id`
- [x] Error codes mapped in `report-api-errors.ts`

## Queue assignment filter (frontend)

The v1 queue lists **lab order assignments**, not report lifecycle alone. Default API filter is **`status=all`** (no `status` query param). Do **not** default to `IN_PROGRESS`: after accept and sample collection, assignments remain **`ACCEPTED`**, so `status=IN_PROGRESS` returns an empty list.

## Queue search (backend-authoritative)

Operational queue search uses **`?q=`** on `GET /api/v1/diagnostics/report-tasks/`. Filters are applied in [`lab_orders_list_service.apply_list_filters`](Hospital-Management-API/labs/api/services/lab_orders_list_service.py) on the branch-scoped assignment queryset (same path as lab orders list).

| Field | Backend match |
|-------|----------------|
| Patient name | `patient_profile` first/last name `icontains` |
| Phone / username | `account.user.username` `icontains` |
| Order number | `order_number` `icontains` |
| Test / service name | `EXISTS` subquery on `DiagnosticOrderTestLine.service.name` (no `.distinct()` — cursor-safe) |

**Frontend rules:**

- Debounced search (400ms) syncs to URL `?q=`
- React Query key includes `q`; **do not** re-filter queue text client-side (`searchReportTasks` is not used on the list page)
- Tab / urgent / TAT / collection filters remain client-side on the API result set
- Empty API `results` with active `q` shows **search_empty**, not **no_tasks**
- Phase 1 uses `icontains`; trigram/full-text indexes are a future optimization

## Action target precedence (backend)

Per assignment, scan active report lines in test-line order; first line eligible per action wins:

| Target field | Action |
|--------------|--------|
| `upload_report_id` | `UPLOAD_REPORT` |
| `mark_ready_report_id` | `MARK_READY` |
| `send_whatsapp_report_id` | `SEND_WHATSAPP` |
| `retry_delivery_log_id` | `RETRY_DELIVERY` (latest failed delivery log on that line) |

## Degraded-mode matrix

| Failure | UI behavior |
|---------|-------------|
| Queue fetch fails | Retry panel; keep last queue via `placeholderData` |
| 3+ poll failures | Amber stale queue banner |
| Detail fails | Queue usable; upload sidebar uses context only |
| Upload succeeds, mark-ready fails | Artifacts kept; reconciliation toast + invalidate |
| WhatsApp mock fails | Upload success preserved |

## Frontend layout

```
lib/labs/reports/api/
  report-api-response.ts
  report-api-errors.ts
  report-api-types.ts
  v1/reports-api.ts
  v1/reports-api-mappers.ts
hooks/labs/
  useReportMutations.ts
  useReportDetail.ts
```

## View order drawer (reports queue)

**Problem:** `View order` on the live v1 queue was a no-op because `orderRow` is only set for orders-fallback/demo tasks.

**Solution:** Reuse [`OrderDetailSheet`](Hospital-Web-UI/medixpro/medixpro/components/labs/orders/OrderDetailSheet.tsx) with instant open + lazy hydration.

| Piece | Behavior |
|-------|----------|
| Open | `setSelectedTask` + `setSheetOpen(true)` immediately (preview row from queue card) |
| Order | `GET /api/labs/orders/assignments/<assignment_id>/` via `fetchLabOrderAssignment` — **no** `labs/orders/?q=` |
| Reports | `report-tasks/<task_id>/`, `reports/<report_id>/`, `reports/<report_id>/history/` |
| Primary report | Temporary `resolvePrimaryReportId` — `upload_target` first (documented shim) |
| Cache | Drawer keys (`order-assignment`, `report-task-context`, `report-detail`, `report-history`) use `REPORT_DRAWER_STALE_MS` (60s) + `placeholderData`; queue poll invalidates **only** `report-tasks` prefix |
| Timeline | Hidden when report panel is active |
| Conflicts | `REPORT_SUPERSEDED` / operational conflict → stale banner + `refreshDrawerReports` |
| Mutations | Owned by `ReportsListPage` (`useReportMutations`); sheet receives callbacks only |

**Manual QA (drawer):**

- [ ] View order opens shell before network completes
- [ ] Drawer open during 15s queue poll — no section flicker
- [ ] Upload correction elsewhere → stale banner → refresh shows new head
- [ ] Mark ready / retry from drawer
- [ ] Demo mode (`?demo=1`) still opens sheet from fallback `orderRow`

## Manual QA

- [ ] Queue collapse persists across 15s poll
- [ ] Empty v1 queue (no orders fallback)
- [ ] Mark ready / retry use `actionTargets` without extra network calls
- [ ] Duplicate upload shows `DUPLICATE_ARTIFACT` copy
- [ ] Upload duplicate-submit blocked (`submissionState`)
- [ ] Stale queue banner after repeated poll errors
- [ ] Branch isolation (wrong branch → `BRANCH_ACCESS_DENIED`)

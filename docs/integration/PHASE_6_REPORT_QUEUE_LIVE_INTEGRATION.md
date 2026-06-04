# Phase 6 — Report Queue Live Integration

## Environment

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_LAB_REPORTS_USE_V1_API` | Default **on**; set `false` to use legacy labs/orders path |
| `BACKEND_PROXY_TARGET=http://127.0.0.1:8000` | Django for Next `/api` rewrites (see `.env.local.example`) |
| `?demo=1` | Optional fixture queue (QA only; shows demo chip) |
| `NEXT_PUBLIC_LAB_REPORTS_DEMO=true` | Force fixtures without URL (avoid for live dev) |
| `NEXT_PUBLIC_LAB_REPORTS_DATA_SOURCE_TOGGLE=true` | Show Live/Mock UI toggle (default: hidden) |

`/lab-dashboard/reports/upload/` redirects to completion with `openOrder` only; it does **not** inject `?demo=1` unless the upload URL already had `demo`.

Copy [`Hospital-Web-UI/medixpro/medixpro/.env.local.example`](Hospital-Web-UI/medixpro/medixpro/.env.local.example) to `.env.local` and restart `npm run dev`.

Next.js rewrites ` /api/v1/diagnostics/*` → Django backend (`next.config.mjs`).

## Completion queue filters (Phase 1)

| Layer | Behavior |
|-------|----------|
| Search `?q=` | Backend `q` on patient, phone, order, test |
| Search keywords | Client-only: `pending`, `ready`, `failed`, `urgent`, `tat`, `tat30` |
| Workflow / TAT / Urgent | Client filters on stub view models after fetch |
| Date default | **Today** (client, `operationalUpdatedAtIso` proxy) |
| API `date_from` / `date_to` | Assignment `assigned_at` — wide window on fetch; do not confuse with visible Today filter |

Future: `GET /report-tasks?date_range=today` filtered on report `updated_at`.

## Queue membership semantics (authoritative)

Order-level queue membership is backend-authoritative via `order_workflow_state`:

- Pending queue includes: `pending_upload`, `partial_upload`
- Ready queue includes: `ready_to_send`
- Delivered queue includes: `delivered`
- Attention queue includes: `attention_required`

Notes:

- `ready_to_send` is allowed only when `uploaded_required_reports == required_reports`
- Invariant: `ready_to_send` cannot have `pending_reports > 0`
- Frontend renders these states and must not re-derive conflicting order state from report chips

## Contract checklist

- [x] Envelope: `{ success, request_id, data, error }`
- [x] Queue: single page `page_size=50`, no client cursor chaining on poll
- [x] Queue card: `available_action_targets` (upload/mark-ready/WhatsApp report ids, retry log id)
- [x] Upload: `POST reports/{report_id}/artifacts/upload/` multipart (`files`, `primary_file_index`, `notes`, `version`, `upload_intent`, `upload_request_id`)
- [x] Mark ready / retry / detail on `report_id` / `log_id`
- [x] Presigned download: `GET reports/{id}/download/`
- [x] Idempotency-Key on mark-ready and send-whatsapp
- [x] Draft upload: Save draft → upload only; Submit → upload + mark-ready
- [x] Operational metrics: `GET reports/operational-metrics/`
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

## Artifact upload (`POST reports/{report_id}/artifacts/upload/`)

Single v1 upload entry for new files and in-place corrections.

| Field | `UPLOAD_NEW` (default) | `REUPLOAD_REPLACE` |
|-------|------------------------|---------------------|
| `files` | 1+ required | **Exactly 1** required |
| `primary_file_index` | Optional | Ignored |
| `notes` | Optional | **Required** (non-empty) — correction reason |
| `upload_intent` | `UPLOAD_NEW` or omit | `REUPLOAD_REPLACE` |
| `mode` (legacy) | `upload` | `reupload` → maps to `REUPLOAD_REPLACE` |
| `upload_request_id` / `Idempotency-Key` | Optional (120s cache) | Same |

Auth: `CanUploadReports` for new upload; `CanCorrectReports` when `upload_intent=REUPLOAD_REPLACE`.

Re-upload replaces the active primary on the **same** report head (version bump; old artifact deactivated). Allowed when lifecycle is `IN_PROGRESS`, `READY`, or `DELIVERED` (locked delivered heads use `validate_report_ready_for_reupload`, not new-upload gates). After replace when delivery had progressed, `delivery_status` resets to `PENDING` so operators must resend.

**Persisted reason:** `notes` is stored on `DiagnosticReportArtifact.reupload_reason` (per replacement) and `DiagnosticTestReport.last_reupload_reason` (latest). Exposed on upload response, `GET reports/{id}/`, and `GET reports/{id}/history/`.

Stable errors: `INVALID_UPLOAD_INTENT`, `MULTI_FILE_REUPLOAD_NOT_ALLOWED`, `REUPLOAD_REASON_REQUIRED`, `REPORT_NOT_READY` (no prior artifact).

## Action target precedence (backend)

Per assignment, scan active report lines in test-line order; first line eligible per action wins:

| Target field | Action |
|--------------|--------|
| `upload_report_id` | `UPLOAD_REPORT` |
| `mark_ready_report_id` | `MARK_READY` |
| `correct_report_id` | `CORRECT_REPORT` (re-upload / replace) |
| `send_whatsapp_report_id` | `SEND_WHATSAPP` |
| `retry_delivery_log_id` | `RETRY_DELIVERY` (latest failed delivery log on that line) |

## Re-upload E2E matrix (READY path)

| # | Scenario | Expected API | Expected UI |
|---|----------|--------------|-------------|
| 1 | READY report, 1 PDF + reason | 201, artifact v2, status stays `ready` | Drawer success; Send enabled |
| 2 | Missing reason | 400 `REUPLOAD_REASON_REQUIRED` | Blocked at confirm |
| 3 | 2 files | 400 `MULTI_FILE_REUPLOAD_NOT_ALLOWED` | Blocked at files step |
| 4 | No prior artifact | 400 `REPORT_NOT_READY` | Empty state / error toast |
| 5 | Same checksum file | 201 | Success |
| 6 | Duplicate `upload_request_id` | 409 `IDEMPOTENCY_CONFLICT` | Idempotency toast |
| 7 | After success, GET detail | Primary = new file | Preview shows new name |
| 8 | DELIVERED + `CORRECT_REPORT` | 201 replace; `delivery_status` → `PENDING` | Re-upload CTA; resend after prior send |

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

## Completion UX API readiness

Production reports UI is `ReportsCompletionPage` with provider-based queue loading:

- `resolveReportsQueueProvider()` — live vs `?demo=1` fixtures (never inside hooks)
- `useReportsOperationalQueue` — polls v1 queue, stub view models, lazy context on expand
- `useReportsCompletionActions` — mutations + invalidation only (no local queue state)
- `buildQuickPreviewTarget` — canonical live preview builder
- Phase 1: no operator `MARK_READY` step (`action-fallback.ts`)

See [REPORTS_UI_API_READINESS_PLAN.md](../frontend/Hospital-Web-UI/REPORTS_UI_API_READINESS_PLAN.md).

## Manual QA

- [ ] Queue collapse persists across 15s poll
- [ ] Empty v1 queue (no orders fallback)
- [ ] Mark ready / retry use `actionTargets` without extra network calls
- [ ] Duplicate upload shows `DUPLICATE_ARTIFACT` copy
- [ ] Upload duplicate-submit blocked (`submissionState`)
- [ ] Stale queue banner after repeated poll errors
- [ ] Branch isolation (wrong branch → `BRANCH_ACCESS_DENIED`)

# Phase 3 — Report Queue Foundation (Frontend)

Operational report queue stabilization for DoctorProCare lab dashboard. Reuses existing routes and UI; adds API layer, domain separation, TanStack Query polling, and guardrails.

## Architecture layers

```
GET v1/diagnostics/report-tasks/  →  mapReportTaskDtoToReportTask  →  ReportTask (slim)
GET report-tasks/:id/ (on demand) →  mapReportTaskContextDto       →  ReportTaskContext
Fallback: labs/orders/            →  mapOrderToReportTask
Demo: reports-demo-queue.ts
```

**Rule:** Queue list must not fetch context per row (avoids N+1).

## Entity split

| Type | Loaded when | Contains |
|------|-------------|----------|
| `ReportTask` | List poll (15s) | Identity, operational status, urgency, TAT flag, labels |
| `ReportTaskContext` | Sheet / upload wizard | `active_reports`, `available_actions` |

`orderRow` on `ReportTask` is legacy — only set on `labs/orders` fallback.

## Data source fallback

1. **v1 API (opt-in):** `NEXT_PUBLIC_LAB_REPORTS_USE_V1_API=true` → `fetchReportTasksList` (requires Next rewrite `/api/v1/diagnostics/`)
2. **Default dev path:** `labs/orders/` double-fetch → `buildReportTasksFromOrders` (v1 call skipped)
3. **Demo fixtures:** merged with live data when `shouldIncludeDemoReportTasks()` (default while v1 is off). Force demo-only: `?demo=1` or `NEXT_PUBLIC_LAB_REPORTS_DEMO=true`. Disable merge: `NEXT_PUBLIC_LAB_REPORTS_INCLUDE_DEMO=false`

## React Query keys

- List: `["lab", branchId, "report-tasks", serializeReportTaskFilters(filters, tab)]`
- Context: `["lab", branchId, "report-task-context", taskId]`
- Poll: `refetchInterval: 15000`, `staleTime: 10000`

Never use a global `["report-tasks"]` key.

## Status choke point

UI uses `ReportOperationalStatus` only. All API strings pass through `mapApiOperationalStatus()` (lifecycle + `PENDING_UPLOAD` / `READY_DELIVERY` buckets).

## KPIs (MVP)

`calculateQueueKPIs(tasks)` — pure function on loaded slice. Includes `urgentCount`, `tatBreachedCount`.

**Future:** backend `summary_counts` on list envelope when cursor pagination ships.

## TAT (MVP)

`isTatBreached()` in `tat-sla.ts` — client heuristic from `assignedAtIso` + urgency SLA hours.

**Future:** backend `tat_breached: boolean`.

## Empty states

`resolveQueueEmptyState()` distinguishes:

- `load_error` — API failure
- `no_tasks` — branch queue empty
- `tab_empty` — tab filter has no rows
- `search_empty` — search with no matches

## Phase 3 non-goals

- Zustand, WebSockets, SSE, Redis live queue
- CQRS / event sourcing / microfrontends
- Real artifact upload API (Phase 4)
- Backend `summary_counts` implementation

## Key files

| Area | Path |
|------|------|
| API | `lib/labs/api/report-tasks.ts` |
| Load + fallback | `lib/labs/reports/load-report-tasks.ts` |
| Mappers | `lib/labs/reports/map-report-task-dto.ts`, `report-task-context.ts` |
| Hooks | `hooks/labs/useLabReportsList.ts`, `useReportTaskContext.ts` |
| UI | `components/labs/reports/*` |

## Execution priorities

1. Queue responsiveness  
2. Operational clarity (CTA, empty states, status)  
3. Stable mapper layer  
4. Low cognitive load for lab staff  

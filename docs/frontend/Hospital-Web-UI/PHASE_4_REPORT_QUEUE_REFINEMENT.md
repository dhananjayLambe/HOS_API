# Phase 4 — Report Queue Refinement (Frontend)

Hardens the existing lab reports workflow queue without a rewrite: URL deep-links, collapse stability during polling, design tokens, loading UX, accessibility, and dead-code cleanup.

## URL parameters

| Param | State |
|-------|--------|
| `tab` | `ReportTabKey` (`pending`, `uploaded`, `ready`, `delivered`, `failed`; omitted = `all`) |
| `urgent=1` | `filters.urgentOnly` |
| `tat=1` | `filters.tatOnly` |
| `collection=HOME\|VISIT` | `filters.collectionType` |
| `q` | Debounced search (`searchInput`) |

Helpers: `lib/labs/reports/report-queue-url.ts` — `parseReportQueueSearchParams`, `buildReportQueueSearchParams`, `reportQueuePathFromParams`.

**Sync:** `useLabReportsList` initializes from URL; `syncQueueToUrl` on tab/filters; search writes to URL after 400ms debounce. Unrelated params (e.g. `demo`) are preserved.

**Dashboard:** Pipeline CTA links to `/lab-dashboard/reports/?tab=pending` (no global upload route).

## Collapse persistence

`ReportsWorkflowQueue` seeds `expandedKeys` only on first load or when new patient group keys appear. Refetch/poll does **not** reset expansion (`loading` removed from expansion effect deps).

`ReportsWorkflowGroup` — presentational group shell (header + task rows). `ReportsWorkflowPatientCard` re-exports for compatibility.

Sticky group headers apply only when `expandedKeys.size <= 3`.

## Design tokens

`lib/labs/reports/queue-tokens.ts`:

- `queueStatusTokens` — row border/bg + status badge
- `kpiTabChipTokens`, `kpiMetaFilterTokens` — KPI strip
- `collectionTypeTokens`, `groupChipTokens`
- `taskRowContainerClassName`, `reportStatusBadgeClassName`

`report-status-badge-tone.ts` delegates to tokens. `report-task-row-tone.ts` re-exports deprecated `taskRowToneClassName`.

## Progress labels

`workflow-progress-labels.ts` — `formatGroupProgressLabel()` e.g. `"2 of 3 reports uploaded · 1 pending"`.

## Loading UX

| Component | When |
|-----------|------|
| `ReportsKpiStripSkeleton` | `loading && !refreshing` (first paint) |
| `ReportsWorkflowSkeleton` | `loading && groups.length === 0` |
| Queue `aria-busy` + opacity | `refreshing && groups.length > 0` |

## Accessibility

- Group header: `aria-expanded`, Enter/Space toggle
- Filter toggles: `aria-pressed` (urgent/TAT)
- KPI chips: `aria-current` on active tab
- Task row CTAs: `aria-label` on secondary actions

## Removed (dead code)

- `ReportsRowActions.tsx`
- `ReportsPatientGroupHeader.tsx`

## Non-goals (CTO)

- No upload API / artifact rewrite
- No WebSocket/SSE live queue
- No virtualization, Zustand, or full page redesign
- No export workflow removal (deferred)
- No further row compression

## Tests

Vitest under `lib/labs/reports/`:

- `report-queue-url.test.ts`
- `workflow-progress-labels.test.ts`
- `queue-tokens.test.ts`

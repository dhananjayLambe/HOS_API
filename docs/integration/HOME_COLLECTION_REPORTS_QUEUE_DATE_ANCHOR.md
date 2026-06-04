# Logistics milestones — reports queue eligibility

The reports queue at `/lab-dashboard/reports/` reads **existing** home and visit workflows. It does not change confirm / check-in / complete or home collection transitions.

## Home collection

Show on report-tasks when:

- `LabCollectionRequest.collection_status = COLLECTED` (`collected_at` set), **or**
- Any active report has already left `pending` (partial upload in progress)

Hide after accept only (collection still `PENDING` / `ASSIGNED` / `IN_PROGRESS`).

## Visit appointment (walk-in)

Workflow unchanged: `PENDING` → confirm → `CONFIRMED` → check-in → `CHECKED_IN` → complete → `COMPLETED`.

Show on report-tasks when:

- `LabVisitAppointment.status` is `CHECKED_IN` or `COMPLETED` and `checked_in_at` is set, **or**
- Any active report has already left `pending`

Hide when:

- After lab accept only (`PENDING` visit)
- After confirm only (`CONFIRMED` — patient not checked in)
- `NO_SHOW` / `CANCELLED`

## API / UI

- Backend filter: `filter_assignments_ready_for_report_queue` on `GET /api/v1/diagnostics/report-tasks/`
- DTO fields: `sample_collected_at` (home `collected_at` or visit `checked_in_at`), `operational_anchor_at` (logistics or upload timestamps — **not** `assigned_at`)
- Frontend safety net: [`reports-queue-filters.ts`](Hospital-Web-UI/medixpro/medixpro/lib/labs/reports/completion/reports-queue-filters.ts) drops rows with no logistics/upload anchor

## Manual verification

### Visit

1. Lab accept → visit `PENDING` — **not** on reports dashboard
2. Confirm → `CONFIRMED` — **not** on reports dashboard
3. Check in → `CHECKED_IN` — **visible** under Today / Pending Upload
4. Complete → `COMPLETED` — **still visible** until reports uploaded/delivered

### Home (regression)

1. Accept → not visible
2. Collect → visible (unchanged from prior home-collection fix)

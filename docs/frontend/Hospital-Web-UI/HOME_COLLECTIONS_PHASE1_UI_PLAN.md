# Home Collections Phase 1 — UI Plan

## Route

`/lab-dashboard/home-collections/` → `LabHomeCollectionsPage`

## Layout

1. Shell header: **Home Collections** + subtitle + **Refresh** only (no CRM icons)
2. KPI summary cards (5 metrics from summary API)
3. Workflow tabs: Pending | Assigned | Active | Collected | Failed
4. Date preset: Today | Tomorrow | This week
5. Search (patient, phone, order ID)
6. Collections queue table + pagination
7. Right drawer (`CollectionDetailSheet`)

## Table columns

| Column | Content |
|--------|---------|
| Patient | Name + age/gender subline |
| Tests | Count + first 1–2 names + overflow |
| Collection slot | Relative date + slot time |
| Assigned to | Name or Unassigned badge |
| Collection status | `LabStatusBadge` domain=collection |
| Workflow | `workflow_hint` from API |
| Actions | Status-driven text buttons only |

## Actions by status

| Status | Primary | Secondary |
|--------|---------|-----------|
| PENDING | Assign | — |
| ASSIGNED | Start Collection | — |
| IN_PROGRESS | Mark Collected | Mark Failed |
| FAILED | Retry | — |
| COLLECTED | View Execution (disabled) | — |

## Removed from this page

- `LabQuickActions` (call, WhatsApp, map, more)
- Mock footer / placeholder copy
- `MOCK_LAB_COLLECTIONS` usage

## Key modules

- `components/labs/home-collections/*`
- `hooks/labs/useLabHomeCollectionsList.ts`
- `lib/labs/api/home-collections.ts`
- `lib/labs/constants/status.ts` — `IN_PROGRESS` for collection domain

## Polling

30s background refresh while page is visible (same pattern as Orders).

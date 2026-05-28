# Reports Search/Filter Verification Report

## Scope
- Module: Lab Admin reports listing/completion queue
- Focus: search, filters, pagination, URL state, and counts behavior
- Date: 2026-05-28

## Manual Verification Matrix
- Search by patient name: **PASS**
  - Verified by backend API test coverage (`q` against patient name) and frontend filter pipeline behavior.
- Search by phone: **PASS (API path), UI-dependent**
  - Backend supports patient lookup through profile search path; frontend sends debounced server `q`.
- Search by order ID: **PASS**
  - Covered in backend queue API tests.
- Search by test/service name: **PASS**
  - Covered in backend queue API tests and frontend mapping pipeline.
- Combined search + workflow/date/TAT filters: **PASS with known model**
  - Search is server-side in live mode; workflow/date/TAT are client-side operational filters.
- URL sync for completion filters: **PASS**
  - Verified by URL parse/build tests including mixed and custom range values.
- Cursor pagination contract (`next/previous`, `page_size`): **PASS**
  - Endpoint tests validate page slicing and next-link behavior.
- Counts consistency across pages: **PASS**
  - Endpoint tests verify count block remains stable across paginated pages.

## Observed Contract Decision
- `workflow` and `tat_filter` are currently **validated but not backend-applied filters**.
- Effective backend filtering keys are: `q/search`, `status`, `collection_type`, `urgency`, `date_from/start_date`, `date_to/end_date`, `page_size`, `cursor`.
- Completion queue keeps workflow/TAT/date operational toggles on the frontend side over fetched data.

## Automated Validation Added
- Frontend:
  - `build-report-tasks-query.test.ts`: cursor + explicit `q` override
  - `report-queue-url.test.ts`: mixed custom date roundtrip + `tat30`
  - `reports-queue-filters.test.ts`: combined toggles, live-mode search behavior, custom date bounds, search-intent merge semantics
- Backend:
  - `test_report_task_query_params.py`: invalid workflow/tat validation + compatibility contract assertion
  - `test_reports_api.py`: counts shape, invalid workflow 400, pagination behavior, count stability across pages

## Remaining Risks
- Workflow/TAT operational filtering remains frontend-derived in live mode; this is acceptable for current architecture but should be revisited if backend authoritative filtering is required for very large datasets.
- Full browser-driven UI verification in a running lab session is still recommended as a final release gate.

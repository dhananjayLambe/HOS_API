# Home collection — reports queue date filtering

After a home collection is marked **collected** (`LabCollectionRequest.collection_status = COLLECTED`):

- Report upload eligibility uses **report lifecycle** (`pending` / `in_progress`), not `DiagnosticOrder.status = sample_collected`.
- The reports queue at `/lab-dashboard/reports/` anchors operational dates from:
  - `sample_collected_at` — `LabCollectionRequest.collected_at` (home) or `LabVisitAppointment.checked_in_at` (walk-in)
  - `assigned_at` — `LabOrderAssignment.assigned_at`
  - Upload timestamps when present (`uploaded_at`, `ready_at`, `delivered_at`)

The default **Today** client filter uses `operational_anchor_at` (exposed on `GET /api/v1/diagnostics/report-tasks/`) so newly collected home orders appear before any report file is uploaded.

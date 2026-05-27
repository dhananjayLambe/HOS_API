# Report version chain and retention policy

## Existing model fields

- `DiagnosticTestReport.revision_number`
- `DiagnosticTestReport.supersedes` / `superseded_by_reports`
- `DiagnosticTestReport.deleted_at` / `deleted_by`
- `DiagnosticReportArtifact.is_active`

## Rules

1. **Never hard-delete** reports or artifacts in production workflows.
2. Corrections create a new report head via `supersedes` (existing correction flow).
3. Operational APIs return **active head only** (see operational truth table).
4. S3 objects for superseded reports are retained for compliance.

## Phase 2 (optional)

- `version_chain_id` — stable UUID across correction chain
- `retention_status` — `active | archived | legal_hold`

## Audit

Use `ClinicalAuditLog` via `emit_report_audit_event` for `report_superseded`, `report_corrected`, `artifact_uploaded`, `report_ready`, `report_download_requested`, `report_shared`, `delivery_sent`, `delivery_failed`.

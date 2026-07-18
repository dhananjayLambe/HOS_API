# API Contract — Doctor Report Workspace (Phase 1 freeze)

Base path:

```
/api/v1/doctors/reports/
```

## Live endpoints (Milestone 2–8)

```
GET  /workspace/                                           # WorkspaceListResponseDTO
GET  /workspace/summary/                                   # WorkspaceSummaryResponseDTO
GET  /workspace/search/                                    # WorkspaceListResponseDTO (search retrieval)
GET  /workspace/reports/{report_id}/                       # WorkspaceReportDetailDTO
GET  /workspace/reports/{report_id}/preview/?clinic_id=    # 302 inline URL | 200 unsupported
GET  /workspace/reports/{report_id}/download/?clinic_id=   # 302 → opaque storage URL
```

Deferred:

```
GET  /patients/search/?q=
POST /bulk-download/
```

Envelope (all doctor v1 workspace responses):

```json
{ "status": "success", "data": { } }
```

Errors: `{ "status": "error", "message": "..." }` with 400 / 401 / 403 / 404.

---

## Code ↔ API.md name aliases

| Code DTO | API.md / contract name |
|----------|------------------------|
| `WorkspaceReportDTO` | WorkspaceReportSummaryDTO |
| `WorkspaceReportDetailDTO` | ReportDetailDTO |
| `WorkspaceSummaryDTO` | WorkspaceQueueCountsDTO |
| `WorkspaceListResponseDTO` | list endpoint root `{ reports, pagination }` |
| `WorkspaceSummaryResponseDTO` | GET `/workspace/summary/` root `{ summary }` |
| `WorkspaceFiltersResponseDTO` | filters metadata root `{ filters }` |
| `PreviewResponseDTO` | unsupported preview `data` (`preview_supported: false`) |

---

## GET `/workspace/`

### Required

| Param | Notes |
|-------|-------|
| `clinic_id` | Doctor must belong to this clinic |

### Pagination

| Param | Notes |
|-------|-------|
| `cursor` | Opaque keyset cursor from prior `pagination.next_cursor` |
| `page_size` | 1–100, default 25 |
| `page` | Echoed in response only (cursor is authoritative) |
| `ordering` | Allowlist: `-uploaded_at` (default), `uploaded_at`, `-report_date`, `report_date`, `-patient_name`, `patient_name` |

### Queues (single source — never merged)

| `queue` | Source |
|---------|--------|
| _(absent)_ | Active reports |
| `reports_ready` | Reports with clinical status AVAILABLE or UPDATED |
| `awaiting` | Pending-upload test lines |
| `critical` | Empty list (Phase 1) |

### Search (`q` on list — same language as `/workspace/search/`)

List may accept optional `q` via the shared `WorkspaceSearchPredicates` module.
Prefer the dedicated search endpoint for free-text UX.

| Matches | Database path | Strategy |
|---------|---------------|----------|
| Patient name | `PatientProfile` first/last | Case-insensitive partial / multi-token |
| Identifier | `PatientProfile.public_id` | Exact or prefix |
| Mobile | `account.user.username` (DTO `mobile`) | Exact or suffix |
| Report number | `DiagnosticTestReport.report_number` | Exact or prefix |
| Test name | `service.name` | Case-insensitive partial |
| Laboratory | `LabBranch.branch_name` | Case-insensitive partial |

Normalization: trim, collapse internal spaces, preserve punctuation and leading zeros.

---

## GET `/workspace/search/`

Dedicated search capability. **Same response DTO** as list (`WorkspaceListResponseDTO`).

### Required

| Param | Notes |
|-------|-------|
| `clinic_id` | Doctor must belong to this clinic |
| `q` | Normalized length ≥ 2; empty/whitespace → 400 |

### Optional

Same pagination (`cursor`, `page_size`, `ordering`) and filters as list (`status`, `patient_id`, `consultation_id`, `encounter_id`, `doctor`, `lab`/`branch`, `category`, date range).

### Source

Active report heads only (not awaiting lines). Ordering is allowlisted chronological keyset (default `-uploaded_at`), not relevance score.

### Intended future ranking precedence (documented; not applied in Phase 1)

1. Exact identifier  
2. Exact report number  
3. Prefix identifier  
4. Prefix report number  
5. Patient name  
6. Test name  
7. Lab name  
8. Mobile exact / suffix  

### Index inventory (no migration without EXPLAIN evidence)

| Field / predicate | Index today |
|-------------------|-------------|
| `public_id` | Yes (unique) |
| `report_number` (UPPER prefix / exact) | `diag_rpt_num_up_pat_idx` (M11) |
| Awaiting `status` + `updated_at` | `diag_line_stat_upd_idx` (M11) |
| Report `supersedes` + `deleted_at` | `diag_rpt_super_del_idx` (M11) |
| Report `deleted_at` + `uploaded_at` | `diag_rpt_del_up_idx` (M11) |
| `service.name` | No btree on name |
| `branch_name` | No |
| `username` | Auth default |

See [PERFORMANCE.md](PERFORMANCE.md) for EXPLAIN rationale.

### Performance targets

- ≤ 3 SQL queries per page; no N+1  
- Summary counts ≤ 2; detail/preview/download ≤ 2  
- Documented latency target &lt; 500 ms for typical doctor-scoped datasets  

### Response `data`

Identical to list: `{ reports, pagination }`.

---

## GET `/workspace/reports/{report_id}/`

Clinical report **detail aggregate** for the workspace drawer. Returns frozen `WorkspaceReportDetailDTO` (API.md: ReportDetailDTO).

### Required

| Param | Notes |
|-------|-------|
| `clinic_id` | Doctor must belong to this clinic |
| `report_id` | Path UUID of an **active** report head |

### Access

Scoped like list: active report head + doctor/clinic scope (`encounter.doctor` OR `order.doctor`, clinic match, excluded encounter statuses). Out-of-scope, superseded, soft-deleted, and unknown ids → **404** (privacy-equivalent). Invalid UUID path / missing `clinic_id` → **400**.

### Response `data`

Full ReportDetailDTO (summary fields + `artifacts`, `timeline`, `clinical_findings`). See frozen shape below.

### Artifact URLs

`preview_url` / `download_url` are **opaque strings** retained on the frozen DTO.

- Previewable artifact `preview_url` is the **workspace preview API path** (with `clinic_id`), not a storage/presigned URL — so existing FE `<iframe>` / `<img src={previewUrl}>` hits the secure preview endpoint without FE changes.
- Non-previewable artifacts keep `preview_url=null`.
- Primary artifact `download_url` is the **workspace download API path** (with `clinic_id`).
- Non-primary artifacts keep `download_url=""`.
- No bucket names, object keys, or storage implementation details are ever returned on detail.

### Performance

Expected SQL: **1** report query (`select_related` + Exists) + **1** artifact prefetch. No N+1 after repository return.

---

## GET `/workspace/reports/{report_id}/preview/`

Secure previewable-artifact access for inline viewing. Previewable success is **HTTP 302** with `Location` set to an opaque time-limited **inline** storage URL. Unsupported types return **200** with `PreviewResponseDTO` (no storage call). Does not modify `WorkspaceReportDetailDTO`.

### Required

| Param | Notes |
|-------|-------|
| `clinic_id` | Query; doctor must belong to this clinic |
| `report_id` | Path UUID of an **active** report head |

### Optional

| Param | Notes |
|-------|-------|
| `artifact_id` | UUID of an **active** artifact on this report. Omitted → primary previewable artifact (backward compatible). |

### Auth

Same as list/detail/download: JWT + `WorkspacePermission` + `clinic_id` + doctor/clinic/active-head scope.

### Status codes

| Status | Meaning |
|--------|---------|
| 302 | Previewable artifact access URL issued |
| 200 | No previewable artifact (default path) — `preview_supported: false` |
| 400 | Missing `clinic_id` or invalid `artifact_id` |
| 403 | Doctor/clinic scope violation |
| 404 | Report out of scope, artifact not on this report, inactive, or non-previewable when `artifact_id` provided |

### Supported types (Phase 1)

| Artifact type | Preview | Download | Print |
|---------------|---------|----------|-------|
| PDF | Yes (inline) | Yes | Yes |
| IMAGE | Yes (inline) | Yes | Yes |
| CSV | Yes (text) | Yes | Yes |
| TXT | Yes (text) | Yes | Yes |
| DOCX (Word) | Download panel | Yes | No (open after download) |
| XLSX (Excel) | Download panel | Yes | No (open after download) |
| ZIP | Download panel | Yes | No |
| DICOM | Download panel | Yes | No (viewer required) |
| OTHER | Download panel | Yes | No |

Upload also accepts `.doc` / `.xls` (stored as DOCX / XLSX).

Future DICOM viewer support must not change this HTTP path or envelope.

### Pipeline (locked order)

1. Auth / scope (401 / 403 / 404 — no storage call)
2. `get_preview_artifact` → `ReportPreviewAggregate`
3. `ArtifactAccessResolver` → owned active artifact (primary previewable if no `artifact_id`)
4. If none previewable (default) → **200** `{ preview_supported: false, preview_url: null, artifact_type: null, expires_at: null }`
5. `schedule_report_viewed` (clinical audit, includes `artifact_id`) **before** URL issuance
6. `ArtifactAccessService.generate_preview_url` → `ReportStorageService.preview_url` (disposition=`inline`)
7. `302 Location: <opaque URL>` (or local authenticated stream when storage is local)

TTL: `settings.REPORT_PRESIGNED_URL_EXPIRY_SECONDS` (default **300** seconds).

Out-of-scope / storage unavailable → **404**. Missing `clinic_id` → **400**.

See also: [MULTI_ARTIFACT.md](MULTI_ARTIFACT.md).

### Explicitly deferred

Thumbnails, transforms, DICOM viewer, annotation, public preview links.

---

## GET `/workspace/reports/{report_id}/download/`

Secure artifact download. Success is **HTTP 302** with `Location` set to an opaque time-limited storage URL. No `WorkspaceReportDetailDTO` body.

### Required

| Param | Notes |
|-------|-------|
| `clinic_id` | Query; doctor must belong to this clinic |
| `report_id` | Path UUID of an **active** report head |

### Optional

| Param | Notes |
|-------|-------|
| `artifact_id` | UUID of an **active** artifact on this report. Omitted → **primary** artifact (backward compatible). |

### Auth

Same as list/detail only: JWT + `WorkspacePermission` + `clinic_id` + doctor/clinic/active-head scope. **No** re-login, OTP, download token, or second challenge.

### Status codes

| Status | Meaning |
|--------|---------|
| 302 | Download access URL issued |
| 400 | Missing `clinic_id` or invalid `artifact_id` |
| 403 | Doctor/clinic scope violation |
| 404 | Report out of scope, artifact not on this report, or inactive |

### Pipeline (locked order)

1. Auth / scope (401 / 403 / 404 — no storage call)
2. `get_download_artifact` → `ReportDownloadAggregate`
3. `ArtifactAccessResolver` → owned active artifact (primary if no `artifact_id`)
4. `schedule_report_downloaded` (clinical audit, includes `artifact_id`) **before** URL issuance
5. `ArtifactAccessService.generate_download_url` → `ReportStorageService.download_url` (disposition=`attachment`)
6. `302 Location: <opaque URL>` (or local authenticated stream when storage is local)

TTL: `settings.REPORT_PRESIGNED_URL_EXPIRY_SECONDS` (default **300** seconds).

Out-of-scope / no active artifacts / storage unavailable → **404** (privacy-equivalent). Missing `clinic_id` → **400**.

Audit and app logs must never include bucket, object key, filename content, or the issued URL.

Detail DTOs include per-artifact `preview_url` / `download_url` with `artifact_id` query params for multi-artifact tabs.

See also: [MULTI_ARTIFACT.md](MULTI_ARTIFACT.md).

### Explicitly deferred

ZIP/batch, streaming/range, download history UI, public/CDN/permanent URLs, step-up download auth.

---

## Filter Contract Rule

> Filters change **selection only**. They must not introduce alternate DTOs, pagination shapes, or expand visibility beyond doctor/clinic scope. Empty matches return `200` with `reports: []`. Invalid enums, inverted `date_from`/`date_to`, or non-UUID id params return `400`.

Filter predicates live in `filters/WorkspaceFilterBuilder` and compose in SQL with search predicates when `q` is present:

1. Scope (doctor/clinic/active/excluded encounters)  
2. Queue / quick source routing (`awaiting` → pending uploads; `reports_ready` → clinical ready; `critical` → empty)  
3. Filter builder `Q` (AND)  
4. Search predicates when `q` present (AND)  
5. Ordering + keyset cursor  

### Supported filters

| Param | Semantics | SQL strategy |
|-------|-----------|--------------|
| `status` | `AVAILABLE` \| `UPDATED` \| `AWAITING_REPORT` | Clinical-status annotations (same as mapper) |
| `lab` / `branch` | LabBranch UUID — **aliases of the same field** | `order.branch_id` (no separate laboratory dimension in Phase 1) |
| `date_from` / `date_to` | Inclusive calendar days; `date_from` ≤ `date_to` | Reports: `uploaded_at` / `ready_at`; awaiting: `updated_at` |
| `quick_filter=today` | Server local date | Reports: `uploaded_at` OR `ready_at`; awaiting: `updated_at` |
| `quick_filter=my_patients` | Encounter doctor = authenticated doctor | `order.encounter.doctor_id = scope.doctor_id` (tightens default scope, which also ORs `order.doctor`) |
| `quick_filter=reports_ready` / `awaiting` | Queue source selection | Service routing / `clinical_ready_only` — not raw filter `Q` alone |
| `doctor`, `category`, `patient_id`, `consultation_id`, `encounter_id` | Existing ID filters | Unchanged |
| `q` | Search language | `WorkspaceSearchPredicates` (composable with filters) |

`lab` and `branch` are equivalent aliases; send either as a UUID. Display names must not be sent as id params.

### Response `data`

```json
{
  "reports": [ /* WorkspaceReportSummaryDTO */ ],
  "pagination": {
    "page": 1,
    "page_size": 25,
    "next_cursor": "string|null"
  }
}
```

Awaiting rows use the **test-line UUID** as `id` (no report yet). Report rows use the **report UUID**.

---

## GET `/workspace/summary/`

Same auth + `clinic_id`. Optional shared filters: `q`, `patient_id`, `consultation_id`, `encounter_id`, `doctor`, `lab`/`branch`, `category`, `date_from`/`date_to`.

### Response `data`

```json
{
  "summary": {
    "reports_ready": 0,
    "awaiting": 0,
    "critical": 0
  }
}
```

- `reports_ready` ← `count_reports` with ready clinical criteria
- `awaiting` ← `count_pending_uploads`
- `critical` ← always `0` in Phase 1

---

## Frozen response shapes

### WorkspacePatientContextDTO

```json
{
  "id": "uuid",
  "name": "string",
  "age": 42,
  "gender": "string",
  "identifier": "PAT123456",
  "mobile": "string|null",
  "last_visit_at": "ISO|null",
  "current_consultation_id": "uuid|null",
  "current_consultation_label": "string|null"
}
```

`identifier` maps to `PatientProfile.public_id`. Never named `uhid` in the API.

### WorkspaceReportSummaryDTO

```json
{
  "id": "uuid",
  "report_number": "string|null",
  "patient": {},
  "test_name": "string",
  "category": "string|null",
  "lab_name": "string|null",
  "branch_name": "string|null",
  "doctor_name": "string|null",
  "consultation_id": "uuid|null",
  "consultation_label": "string|null",
  "encounter_id": "uuid|null",
  "collection_date": "ISO|null",
  "report_date": "ISO|null",
  "uploaded_at": "ISO|null",
  "clinical_status": "AWAITING_REPORT|AVAILABLE|UPDATED",
  "clinical_findings_preview": "string|null"
}
```

### ReportDetailDTO

Summary plus:

```json
{
  "artifacts": [
    {
      "id": "uuid",
      "label": "string",
      "artifact_type": "PDF|IMAGE|CSV|XLSX|DOCX|TXT|ZIP|DICOM|OTHER",
      "preview_url": "string|null",
      "download_url": "string",
      "is_primary": true
    }
  ],
  "timeline": {
    "ordered_at": "ISO|null",
    "collected_at": "ISO|null",
    "uploaded_at": "ISO|null"
  },
  "clinical_findings": "string|null"
}
```

Artifacts are returned in **presentation order** owned by `ArtifactService` (selected primary first, then newest `uploaded_at`). Tuple position is the display order. Clients must not re-sort for Phase 1 UX. Labels (e.g. `Primary Report`) are service-owned, not frontend-hardcoded. Previewable `preview_url` and primary `download_url` are opaque workspace API paths (see preview/download endpoints above).

### WorkspaceArtifactDTO

```json
{
  "id": "uuid",
  "label": "string",
  "artifact_type": "PDF|IMAGE|CSV|XLSX|DOCX|TXT|ZIP|DICOM|OTHER",
  "preview_url": "string|null",
  "download_url": "string",
  "is_primary": true
}
```

### WorkspaceQueueCountsDTO

```json
{
  "reports_ready": 0,
  "awaiting": 0,
  "critical": 0
}
```

## Clinical statuses (doctor-facing only)

| Value | UI label |
|-------|----------|
| `AWAITING_REPORT` | Awaiting Report |
| `AVAILABLE` | Available |
| `UPDATED` | Updated |

Internal storage statuses (`pending`, `ready`, `delivered`, …) are never returned.

## Explicitly out of Phase 1 contract

- `uhid`, `priority`, `is_critical`, clinical review / commit review
- `prescription_summary`, `hospital_name`, `report_type`
- `versions[]`, Corrected / Archived as UI statuses

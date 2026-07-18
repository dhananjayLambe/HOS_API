# Architecture — Doctor Report Workspace

## Bounded context

| App | Owns |
|-----|------|
| `diagnostics_engine` | Diagnostic data production: catalog, booking, collection, report upload, artifacts, versioning, lab ops |
| `consultations_core` | Encounters and consultations |
| `patient_account` | Patient profiles and accounts |
| `doctor_report_workspace` | Doctor report **consumption** workflow |

## Layer stack

```
APIView (list | summary | search | detail | preview | download)
  → WorkspaceListService | WorkspaceSummaryService | WorkspaceSearchService
    | WorkspaceReportDetailService | WorkspaceReportPreviewService
    | WorkspaceReportDownloadService
      → WorkspaceReportRepository
          → WorkspaceFilterBuilder / WorkspaceSearchPredicates
          → ReportDetailAggregate | ReportPreviewAggregate | ReportDownloadAggregate
      → ArtifactService (PrimaryArtifactSelector + LabelResolver + resolve_preview)
          → ArtifactPresentation tuple
      → ArtifactAccessService (preview inline | download attachment; wraps ReportStorageService)
      → ClinicalStatusMapper (detail)
      → WorkspaceResponseMapper (detail structural presentation → DTO)
  → DTO.to_dict() → JSON envelope  |  HttpResponseRedirect (preview/download 302)
```

### Aggregate Rule

> Repository methods that compose data from multiple domain models must return **immutable aggregate objects** rather than ORM models. Services orchestrate aggregates, mappers transform aggregates into DTOs, and API views never access ORM models directly.

### Aggregate lifecycle (`ReportDetailAggregate`)

| Property | Rule |
|----------|------|
| Purpose | Internal clinical **read model** (domain entities) |
| Produced by | Repository only (`get_report_detail`) |
| Consumed by | Service → ArtifactService / Mapper |
| Immutable | `frozen=True` dataclass |
| Never | Returned by API, persisted, or imported by views |

Detail flow:

```
scope → active head → Prefetch(active artifacts, -uploaded_at)
  → ReportDetailAggregate (raw)
  → ArtifactService.present → ArtifactPresentation tuple
  → ClinicalStatusMapper
  → inject opaque API preview_url (previewable) + download_url (primary)
  → WorkspaceResponseMapper.to_report_detail_from_aggregate
  → WorkspaceReportDetailDTO
```

### Aggregate lifecycle (`ReportPreviewAggregate` / `ReportDownloadAggregate`)

| Property | Rule |
|----------|------|
| Purpose | Internal access **read model** (report + active artifacts) |
| Produced by | `get_preview_artifact` / `get_download_artifact` |
| Consumed by | Preview / Download workspace services |
| Never | Selection, URLs, audit, or API serialization on the aggregate |

Preview flow (security order locked):

```
auth → get_preview_artifact → ReportPreviewAggregate
  → ArtifactService.resolve_preview → previewable ORM artifact
  → schedule_report_viewed (audit first)
  → ArtifactAccessService.generate_preview_url (inline)
  → HTTP 302  |  200 PreviewResponseDTO if unsupported
```

Download flow:

```
auth → get_download_artifact → ReportDownloadAggregate
  → ArtifactService.present → primary ORM artifact
  → schedule_report_downloaded (audit first)
  → ArtifactAccessService.generate_download_url (attachment)
  → HTTP 302 Location: opaque presigned URL
```

See [ADR-006](adr/ADR-006-artifact-presentation-pipeline.md), [ADR-007](adr/ADR-007-secure-artifact-preview.md), [ADR-008](adr/ADR-008-secure-artifact-download.md).

### Artifact ownership

| Layer | Responsibility |
|-------|----------------|
| Repository | Retrieve active artifacts (stable load order `-uploaded_at`); no primary/preview pick |
| `PrimaryArtifactSelector` | Which artifact is primary |
| `ArtifactLabelResolver` | Human labels |
| `ArtifactService` | Present + `resolve_preview` (previewable selection) |
| Mapper | Structural `ArtifactPresentation` → `WorkspaceArtifactDTO` only |
| `ArtifactAccessService` | Opaque URLs: preview=`inline`, download=`attachment` via `ReportStorageService` |
| Detail service | Opaque workspace API paths for FE continuity (no presign at detail) |
| Preview / Download services | Resolve → audit → access URL → redirect/result |
| API | Envelope serialization or 302 redirect |

### Mapper Rule (artifacts)

> Mapper must never perform if/switch/sorting/selection on artifacts. It copies `ArtifactPresentation` fields into `WorkspaceArtifactDTO` only. Detail may receive `preview_url_by_artifact_id` / `download_url_by_artifact_id` (opaque workspace API paths). Presigned storage URLs are issued only by `ArtifactAccessService` on preview/download click paths.

### Other ownership

| Concern | Owner |
|---------|--------|
| Raw timeline timestamps | Repository → aggregate slots |
| `WorkspaceTimelineDTO` | Mapper only |
| Clinical findings formatting | Mapper only |
| Opaque workspace preview/download paths on detail | Detail service → mapper URL maps |
| Presigned storage URL | `ArtifactAccessService` on preview/download only |
| Clinical view/download audit | `schedule_report_viewed` / `schedule_report_downloaded` before URL issuance |

### Search Contract Rule

> Search endpoints must return the **same DTOs and pagination contract** as their corresponding list endpoints. Search changes **retrieval semantics only**; it does not introduce alternative response models.

If the backend later migrates from PostgreSQL ORM predicates to OpenSearch (or another engine), the public HTTP path, envelope, and `WorkspaceListResponseDTO` shape must remain unchanged.

### Filter Contract Rule

> Filters change **selection only**. Same list URL, same `WorkspaceListCriteria`, same DTO. No client-side post-filtering on the live path. Lab and branch are Phase 1 aliases of `order.branch_id`.

`quick_filter=my_patients` is meaningful SQL: `encounter.doctor_id ==` authenticated doctor (tightens default doctor scope that also ORs `order.doctor`).

Repository orchestration order (list/search): **scope → filter builder → search predicates → order → cursor → evaluated rows**.

### Performance Rule

> Performance optimizations belong exclusively in the repository layer (and owning-app index migrations). Services must never optimize by issuing extra SQL; mappers must never trigger lazy loading; views remain unaware of ORM techniques. Every index or query-shape change must preserve API contracts and be backed by measurable evidence (query budgets and/or `EXPLAIN`).

See [PERFORMANCE.md](PERFORMANCE.md) and [ADR-011](adr/ADR-011-measurement-first-performance.md).

### Production Cutover Rule

> After Milestone 12, the doctor Diagnostic Report Workspace has a **single production data path**. The frontend must not ship a demo/fixture provider, URL `demo` switch, or provider factory for this workspace. Runtime data comes only from live `doctor_report_workspace` APIs.

See [PRODUCTION_CUTOVER.md](PRODUCTION_CUTOVER.md) and [ADR-012](adr/ADR-012-production-cutover-live-only.md).

Milestone 13 Production Integration Certification (contract matrix, Network traces, readiness certificate): [INTEGRATION.md](INTEGRATION.md), [ADR-013](adr/ADR-013-production-integration-certification.md).

### Strict rules

1. Repository returns **evaluated domain rows** (`ReportRow` / `AwaitingRow`) or **aggregates** (`ReportDetailAggregate`, `ReportPreviewAggregate`, `ReportDownloadAggregate`), never open QuerySets.
2. Repository data methods: `find_reports`, `find_pending_uploads`, `search_reports`, `get_report_detail`, `get_preview_artifact`, `get_download_artifact`, `count_reports`, `count_pending_uploads`.
3. Search language lives in `search/WorkspaceSearchPredicates` — repository orchestrates, does not own field strategies.
4. Filter language lives in `filters/WorkspaceFilterBuilder` — pure `Q` construction; no queryset execution.
5. Artifact presentation lives in `services/artifacts/` — no DB; access service may call storage wrappers only.
6. KPI labels (`reports_ready`, `awaiting`, `critical`) are computed only in **WorkspaceSummaryService**.
7. Mapper never talks to the repository; service orchestrates both.
8. Clinical status derivation lives only in `ClinicalStatusMapper`.
9. Views never access ORM or build response field maps by hand.
10. **Never merge** report + pending-upload querysets for a single cursor page.
11. Default search source = active **report** heads only (cursor-stable).
12. Index migrations only with EXPLAIN evidence.
13. Not-found for detail/preview/download: repo `None` → service `WorkspaceReportNotFound` → view `404`.
14. Preview/download: audit before URL; never log bucket/key/presigned URL; no storage call on 401/403/404/unsupported.

### Cursor / queue sources

| `queue` / mode | Repository method |
|----------------|-------------------|
| (absent) / `reports_ready` | `find_reports` |
| `awaiting` | `find_pending_uploads` |
| `critical` | empty (Phase 1) |
| free-text search | `search_reports` |
| report detail | `get_report_detail` |
| report preview | `get_preview_artifact` |
| report download | `get_download_artifact` |

## DTO versioning

DTO field names are backward compatible within a major API version (`/api/v1/`). Fields may be **added**; existing fields are not renamed or removed without a new API version.

## Package layout

- `api/views/`, `api/urls.py` — list, summary, search, detail, preview, download
- `dto/` — Phase 1 contracts + `PreviewResponseDTO`
- `domain/rows.py`, `domain/report_detail_aggregate.py`, `domain/report_preview_aggregate.py`, `domain/report_download_aggregate.py`, `domain/artifact_presentation.py`
- `search/`, `filters/`
- `mappers/` — `WorkspaceResponseMapper`
- `repositories/` — `WorkspaceReportRepository`
- `services/artifacts/` — `ArtifactService`, `PrimaryArtifactSelector`, `ArtifactLabelResolver`, `ArtifactAccessService`
- `services/workspace/` — list / summary / search / detail / preview / download, status mapper
- `permissions/`, `docs/` (incl. `docs/adr/`), `tests/`

## Observability

Actions (`LogModule.REPORTS`):

- `doctor_report_workspace.list`
- `doctor_report_workspace.summary`
- `doctor_report_workspace.search`
- `doctor_report_workspace.detail`
- `doctor_report_workspace.preview`
- `doctor_report_workspace.download`
- `doctor_report_workspace.artifact_service`

**Detail logs:** `report_uuid`, `clinic_uuid`, `duration_ms`, `artifact_count`.

**Preview / download logs:** `report_uuid`, `artifact_uuid`, `clinic_uuid`, `duration_ms` (preview may log `preview_supported: false`).

**Artifact service logs:** `report_uuid` (optional), `artifact_count`, `primary_selected`, `duration_ms`.

Framework enriches `correlation_id` — do not put it in metadata.

**Never log:** raw search terms, patient names, mobiles, identifiers, report numbers, clinical findings, filenames, buckets, storage keys, presigned URLs, report body.

## Performance targets

| Path | Budget |
|------|-------:|
| List / search / awaiting | ≤ 3 SQL (typically 1 with `select_related`) |
| Summary counts | ≤ 2 (`count_reports` + `count_pending_uploads`, no hydrate joins) |
| Detail / preview / download | ≤ 2 (report + artifact Prefetch) |

- Presign only on preview/download click (not at detail time).
- Index migrations only with EXPLAIN evidence ([PERFORMANCE.md](PERFORMANCE.md)).
- Hard budgets enforced in `tests/test_workspace_performance.py`.

## Forbidden reverse dependency

```
diagnostics_engine / consultations_core / patient_account
  must never import doctor_report_workspace

doctor_report_workspace must never import doctor.api views/serializers
```

Full rules: [DEPENDENCIES.md](DEPENDENCIES.md).

## Clinical status (doctor-facing)

- `AWAITING_REPORT`
- `AVAILABLE`
- `UPDATED`

Defined in `domain/statuses.py`. Derivation owned solely by `ClinicalStatusMapper`.

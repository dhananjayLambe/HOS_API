# ADR-008 — Secure Artifact Download

## Status

Accepted (Milestone 8)

## Context

Doctors need one-click download of the primary report artifact from the workspace. Detail already returns artifact DTOs with `download_url`. Storage credentials and object keys must never reach the browser or logs. Clinical audit must record downloads.

## Decision

```
GET .../workspace/reports/{report_id}/download/?clinic_id=
  → same workspace auth as detail (JWT + WorkspacePermission + scope)
  → ReportDownloadAggregate (raw active artifacts)
  → ArtifactService primary
  → schedule_report_downloaded (audit before URL)
  → ArtifactAccessService → ReportStorageService.download_url
  → HTTP 302 Location: opaque TTL URL
```

- TTL: `REPORT_PRESIGNED_URL_EXPIRY_SECONDS` (default 300).
- Detail injects **workspace API path** as primary `download_url` (not presigned) so FE needs no code changes.
- Repository does **not** select primary; `ArtifactService` owns that.
- No boto3 in `doctor_report_workspace`; storage stays in `diagnostics_engine`.
- No extra download authentication beyond workspace auth.

## Consequences

- Effortless UX for already-authenticated doctors; scope isolation still yields 404.
- Storage is touched only on successful authorized download clicks.
- Frozen DTO field set unchanged; download endpoint returns no detail DTO.
- Multi-artifact / ZIP / streaming / step-up auth remain deferred.

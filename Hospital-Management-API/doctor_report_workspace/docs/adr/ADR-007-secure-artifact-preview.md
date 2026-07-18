# ADR-007 — Secure Artifact Preview

## Status

Accepted (Milestone 7)

## Context

Doctors need inline PDF/image preview in the Diagnostic Report Workspace. The FE loads `artifact.previewUrl` in `<iframe>` / `<img>` and must not change. Preview and download must share one access layer with different response dispositions. Storage keys and buckets must never reach the browser or logs.

## Decision

```
GET .../workspace/reports/{report_id}/preview/?clinic_id=
  → same workspace auth as detail
  → ReportPreviewAggregate (raw active artifacts)
  → ArtifactService.resolve_preview (PDF/IMAGE)
  → schedule_report_viewed (audit before URL)
  → ArtifactAccessService.generate_preview_url (inline disposition)
  → HTTP 302 Location: opaque TTL URL

Unsupported (OTHER-only) → 200 PreviewResponseDTO { preview_supported: false }
```

- Detail injects opaque workspace preview API path as `preview_url` for the previewable artifact (FE continuity; no presign at detail time).
- `ArtifactAccessService` is shared: preview=`inline`, download=`attachment`.
- TTL: `REPORT_PRESIGNED_URL_EXPIRY_SECONDS` (default 300).
- Future DICOM support extends selection/access without changing the HTTP path or detail DTO field set.

## Consequences

- Effortless iframe preview for already-authenticated doctors.
- Single storage access abstraction for preview and download.
- Unsupported types fail closed without a storage call.
- Thumbnails, streaming, annotation, and DICOM viewer remain deferred.

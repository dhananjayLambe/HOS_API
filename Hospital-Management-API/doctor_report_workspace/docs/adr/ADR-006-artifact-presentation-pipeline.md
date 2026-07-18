# ADR-006 — Artifact Presentation Pipeline

## Status

Accepted (Milestone 6)

## Context

Doctor Report Workspace (and future Patient Portal, Lab Portal, WhatsApp delivery, Download APIs, Mobile) need consistent artifact primary selection, ordering, labels, and preview metadata — without coupling to object storage or signed URL providers.

## Decision

```
Repository
  → ReportDetailAggregate (raw active artifacts)
  → ArtifactService
      → PrimaryArtifactSelector
      → order (tuple position)
      → ArtifactLabelResolver
      → ArtifactPreviewMetadata
  → ArtifactPresentation tuple
  → WorkspaceResponseMapper (structural)
  → WorkspaceArtifactDTO
```

- Aggregate remains a **repository read model** (domain entities only).
- `ArtifactService` is **storage-agnostic** (no QuerySet, no `file.url`, no buckets/keys).
- Mapper performs **no** artifact business rules (no if/switch/sort/selection).
- Phase 1 DTO URLs: `preview_url` / `download_url` are opaque workspace API paths for previewable/primary artifacts (see ADR-007 / ADR-008).
- **`ArtifactAccessService`** issues presigned storage URLs only on preview/download endpoints — not at detail time. Preview uses `inline` disposition; download uses `attachment`.

## Consequences

- Storage-independent and reusable across doctor / patient / lab / WhatsApp / downloads / mobile.
- Deterministic presentation order and labels.
- Clear insertion point for signed URLs, thumbnails, OCR, and AI without redesigning the detail service.
- `WorkspaceArtifactDTO` stays frozen for Phase 1.

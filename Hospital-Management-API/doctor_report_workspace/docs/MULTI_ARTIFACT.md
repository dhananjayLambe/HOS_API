# Multi-Artifact Report Support

Domain: doctors and lab operators work with **artifacts** (`DiagnosticReportArtifact`), not opaque “files.”

## Lifecycle (documented)

```text
Created → Uploaded → Active → Previewable|Downloadable → Archived → Deleted
```

Workspace preview/download operate on **Active** artifacts. Archive is used by replace flows; full archive/delete UX is out of scope.

## Locked product rules

| Rule | Decision |
|------|----------|
| `UPLOAD_NEW` vs `REUPLOAD_REPLACE` | Separate operations. Never merge. |
| Append (`UPLOAD_NEW` with existing artifacts) | Always creates new **active** artifact(s). Does not archive same-type siblings. DB unique-per-type constraint removed (migration 0021). |
| Checksum | Same SHA on an active artifact of that report → validation error. No soft merge. |
| Primary after append | Existing primary remains when `primary_file_index` is omitted. Newest does not become primary. |
| Re-upload | Single file; replaces the target/primary path. |
| Preview/download without `artifact_id` | Resolve **primary** (backward compatible). |
| With `artifact_id` | Resolve only if owned by the report and doctor/clinic scope passes. |

## Artifact identity (anti-IDOR)

Every access validates:

1. Report scope (workspace report under doctor/clinic)
2. Artifact ownership (`artifact` belongs to that report, active)
3. Clinic / doctor authorization

Never look up an artifact UUID in isolation.

## Ordering

1. Primary first  
2. Then `uploaded_at` ASC  
3. Then artifact UUID  

## Manual verification checklist

1. Lab: multi-artifact first upload (PDF + CSV) → both stored.
2. Doctor: tabs show `TYPE · Primary? · name`; each preview/download works.
3. Lab: append another PDF via upload/add → previous PDF remains; primary unchanged.
4. Lab: Re-upload → single file; replaces target; siblings remain.
5. Cross-report `artifact_id` → 404; cross-doctor scope → 404/403.


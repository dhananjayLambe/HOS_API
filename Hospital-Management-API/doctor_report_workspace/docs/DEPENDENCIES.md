# Dependencies — Doctor Report Workspace

## Allowed imports

`doctor_report_workspace` **may** depend on:

| Target | What to reuse |
|--------|----------------|
| `diagnostics_engine` | `DiagnosticTestReport`, `DiagnosticReportArtifact`, orders/test lines, report query/download/storage services |
| `consultations_core` | Encounter, Consultation (read for context labels) |
| `patient_account` | `PatientProfile`, `PatientAccount` |
| `doctor` | Doctor **models / stable services only** (identity, clinic scope) |
| `clinical_audit` | Existing clinical audit framework |
| `business_audit` | Existing business audit / logging |
| `notifications` | Future delivery hooks |

## Forbidden imports

### Reverse (must never happen)

```
Forbidden Imports

diagnostics_engine
consultations_core
patient_account

must never import

doctor_report_workspace
```

### API-layer coupling

```
doctor_report_workspace must never import doctor.api
```

Consume stable models/services only — not another app's HTTP views, serializers, or URL modules.

### Duplication

Do **not** copy report/artifact/storage logic from `diagnostics_engine`. Orchestrate and present; do not reimplement.

## Reuse policy

| Concern | Owner | Workspace role |
|---------|-------|----------------|
| Report generation / upload | `diagnostics_engine` | Read via query/download services |
| Artifact storage / S3 | `diagnostics_engine.storage` | Request URLs via Artifact/Preview/Download services |
| Patient identity | `patient_account` | Embed `identifier` (`public_id`) in DTOs |
| Encounter / consultation | `consultations_core` | Context labels only |
| Doctor clinic scope | `doctor` models/services | Permission scoping |

## Ownership matrix

| Capability | Owner |
|------------|-------|
| Test catalog | `diagnostics_engine` |
| Lab booking / routing | `diagnostics_engine` |
| Sample collection | `diagnostics_engine` |
| Report upload / versioning | `diagnostics_engine` |
| Artifact storage | `diagnostics_engine` |
| Doctor search / filters | `doctor_report_workspace` |
| Report browser / counts | `doctor_report_workspace` |
| Preview / download (doctor) | `doctor_report_workspace` |
| Patient Summary navigation | `doctor_report_workspace` → existing patient UI |

## Shared services (consume, don't fork)

- `diagnostics_engine.services.reports.report_query_service`
- `diagnostics_engine.services.reports.report_download_service`
- `diagnostics_engine.domain.reports.active_report`
- `diagnostics_engine.storage.*`
- Doctor dashboard query helpers under `doctor.api.services.dashboard_report_queries` (stable query helpers only — not `doctor.api` views)

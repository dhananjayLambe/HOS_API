# Doctor Report Workspace

Doctor-facing clinical report workflow for DoctorProCare.

## Why this app exists

`diagnostics_engine` owns diagnostic data (catalog, booking, sample collection, report upload, artifacts, versioning).

`doctor_report_workspace` owns the doctor-facing clinical workspace (search, browser, preview, download, patient-summary navigation).

This separation prevents UI workflow logic from leaking into the diagnostics domain and keeps ownership boundaries explicit.

## Responsibilities (this app)

- Search reports (patient-centric)
- Report browser + queue counts
- Report preview
- Secure download
- Patient Summary navigation context

## Non-responsibilities

- Test catalog, lab booking, sample collection
- Report generation / upload / artifact storage
- Lab operational workflows

Those remain in `diagnostics_engine`.

## Architecture at a glance

```
Doctor UI
    │
    ▼
doctor_report_workspace
    │
    ▼
diagnostics_engine
    │
    ▼
Storage
```

See [ARCHITECTURE.md](ARCHITECTURE.md) and [DEPENDENCIES.md](DEPENDENCIES.md).

## API

Namespace (reserved Milestone 0):

```
/api/v1/doctors/reports/
```

See [API.md](API.md) for frozen contracts and planned routes.

Artifact storage (local vs S3 via env): [STORAGE.md](STORAGE.md).

Multi-artifact lifecycle (append, primary, preview/download `artifact_id`): [MULTI_ARTIFACT.md](MULTI_ARTIFACT.md).

## Roadmap

| Phase | Scope |
|-------|--------|
| Milestone 0 | App scaffold, docs, URL namespace |
| Phase 1 (M1–M11) | Search, browser, preview, download, artifacts, performance |
| Milestone 12 | Production cutover — live-only FE; demo provider removed |
| Milestone 13 | Production Integration Certification — matrix, contract cert, readiness certificate |
| Phase 2 | Previous reports, version history, comparison |
| Phase 3 | AI summaries, trends, structured lab values |
| Phase 4 | Patient app / telemedicine report access |
| Phase 5 | FHIR/HL7 exchange and enterprise integrations |

## Milestone 12 status

**Released (closeout 2026-07-17)** — production cutover:

- Live `createLiveWorkspaceProvider` is the only runtime data path
- Demo provider / factory / workspace URL `demo` removed
- Test fixtures retained for unit tests only
- Automated regression: `doctor_report_workspace` **167** tests OK; FE filter tests **6/6** OK
- Gate checklist: [PRODUCTION_CUTOVER.md](PRODUCTION_CUTOVER.md), [ADR-012](adr/ADR-012-production-cutover-live-only.md)
- Remaining ops: confirm CloudWatch/dashboards at production deploy; optional authenticated UI spot-check of preview/download

## Milestone 13 status

**Released (closeout 2026-07-18)** — Production Integration Certification:

- Ownership matrix, contract certification, Network traces, browser matrix, observability + M11 performance checks
- Integration gaps fixed: cursor pagination wired; advanced lab/doctor/branch name-as-id selects disabled
- Certificate and evidence: [INTEGRATION.md](INTEGRATION.md), [ADR-013](adr/ADR-013-production-integration-certification.md)
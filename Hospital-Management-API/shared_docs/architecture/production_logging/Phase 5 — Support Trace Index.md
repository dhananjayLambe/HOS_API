I think we should follow the same maturity model that we used for Clinical Audit (M3.x) and Business Audit (M4.x).

Support Trace is not just another model—it becomes the Production Investigation Platform that sits on top of Clinical Audit, Business Audit, Correlation Framework, and Application Logs.

I would split Phase 5 into 9 milestones.

⸻

Phase 5 — Support Trace Index

Objective

Provide a unified production investigation platform that enables developers, support engineers, and administrators to reconstruct any workflow from a single identifier without querying multiple systems.

The Support Trace platform becomes the canonical search and investigation layer for DoctorProCare by indexing workflow state, business identifiers, correlation IDs, and operational metadata while linking Clinical Audit, Business Audit, and Application Logs.

Unlike Clinical Audit and Business Audit, Support Trace is not an audit system. It is a searchable workflow index optimized for production debugging, operational support, and incident investigation.

⸻

Overall Architecture

                 DoctorProCare Platform
        Clinical Audit      Business Audit
               │                  │
               └──────────┬───────┘
                          │
                  Support Trace Index
                          │
            Trace Lookup Service
                          │
         Search API / Timeline API
                          │
      CloudWatch • Application Logs

⸻

Milestone 5.1 — Support Trace Foundation

**Status: Complete**

Objective

Create the Support Trace framework and indexing platform.

⸻

Milestone 5.2 — Workflow State Management

**Status: Complete**

Objective

Maintain the latest workflow state for every operational workflow via automatic Clinical/Business Audit projection.

Canonical path: Audit → SupportTraceSyncEvent → ProjectionEngine → WorkflowSyncService → SupportTrace.

See [`support_trace/docs/WORKFLOW_SYNC.md`](../../../support_trace/docs/WORKFLOW_SYNC.md).

⸻

Milestone 5.3 — Identifier Resolution Framework

Status

**Complete**

⸻

Objective

Create the universal identifier indexing framework that allows any production workflow to be located using any known business identifier.

Support engineers paste any ID; `IdentifierLookupService.lookup_any()` detects type, plans search, and returns SupportTrace matches with full metadata.

⸻

Architecture

```
Clinical/Business Audit → WorkflowSync → IdentifierSync → SupportTrace
                                              ↓
                                    IdentifierLookupService
```

⸻

Deliverable

Universal identifier resolution layer — strategy-based registries, SearchPlanner, RelationshipResolver, rich lookup results. Foundation for M5.5–M5.9 without architectural redesign.

See [`support_trace/docs/IDENTIFIER_LOOKUP.md`](../../../support_trace/docs/IDENTIFIER_LOOKUP.md).

⸻

Milestone 5.4 — Timeline Aggregation Engine

**Status: Complete**

Objective

Read-only projection that aggregates Clinical Audit, Business Audit, and Support Trace current state into a unified chronological timeline. No new tables, no writes.

⸻

Architecture

```
TimelineService.build_*_timeline()
  → TimelineResolver (scope expansion via M5.3 RelationshipResolver)
  → TimelineRepository.fetch_bundle()
  → ClinicalAdapter / BusinessAdapter / SupportTraceAdapter
  → TimelineMerger → Sorter → TimelineGraphBuilder
  → WorkflowSnapshot + Statistics → TimelineResult
```

Key components:

* **Source adapters** (`timeline/adapters/`) — convert audit rows to `TimelineEvent`
* **Stable IDs** — `timeline_event_id` via UUID5 for deduplication
* **TimelineGraph** — nodes + edges + `as_tree()` for M5.7
* **WorkflowSnapshot** — derived health from latest events
* **certification.py** — fail-open validators for M5.9

⸻

Public API

```python
from support_trace.timeline import TimelineService

TimelineService.build_correlation_timeline(correlation_id)
TimelineService.build_patient_timeline(patient_id)
TimelineService.build_consultation_timeline(consultation_id)
TimelineService.build_booking_timeline(booking_id)
TimelineService.build_workflow_timeline(workflow_instance_id)
```

⸻

Timeline example

Example

08:00 Consultation Started
08:03 Symptoms Recorded
08:05 Diagnosis Added
08:08 Recommendation Generated
08:10 Booking Created
08:12 Routing Started
08:14 Lab Assigned
08:20 Report Uploaded
08:30 WhatsApp Delivered

⸻

Sources

Aggregate

* Clinical Audit
* Business Audit
* Workflow States

⸻

Deliverable

Unified patient and workflow timeline via `TimelineService` — 19 tests, full suite 464 passed.

See [`support_trace/docs/TIMELINE_ENGINE.md`](../../../support_trace/docs/TIMELINE_ENGINE.md).

⸻

Milestone 5.5 — Support Investigation Engine

**Status: Complete**

Objective

Canonical production investigation layer — orchestrates M5.3 identifier resolution, M5.4 timeline aggregation, SupportTrace state, and audit retrieval into a single `TraceLookupResult`. No new persistence.

⸻

Architecture

```
TraceLookupService.investigate() / lookup_by_*()
  → InvestigationEngine (InvestigationContext + InvestigationPolicy)
  → IdentifierLookupService + TimelineEngine.build_from_bundle
  → SummaryBuilder + HealthBuilder + InvestigationReportBuilder
  → TraceLookupResult
```

⸻

Public API

```python
from support_trace.lookup import TraceLookupService, InvestigationLevel

TraceLookupService.investigate(raw)
TraceLookupService.lookup_any(raw)
TraceLookupService.lookup_by_booking(booking_id)
TraceLookupService.lookup_by_correlation(correlation_id)
TraceLookupService.lookup_many(ids, parallel=True)
```

⸻

Deliverable

Single investigation path for production support — 33 tests, full suite 497 passed.

See [`support_trace/docs/INVESTIGATION_ENGINE.md`](../../../support_trace/docs/INVESTIGATION_ENGINE.md).

⸻

Milestone 5.6 — Support Investigation REST API Platform

**Status: Complete**

Objective

Expose M5.5 investigation engine via read-only REST API at `/api/v1/support/`.

Architecture

```
DRF View → InvestigationRequest + SupportInvestigationContext
         → SupportInvestigationFacade
         → TraceLookupService / TimelineService
         → serializers/v1 → ApiEnvelope + investigation_id
```

APIs

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/api/v1/support/search` | Simple + advanced search |
| GET | `/api/v1/support/workflow/{id}` | Workflow investigation |
| GET | `/api/v1/support/{resource}/{id}` | Booking, correlation, patient, etc. |
| GET | `/api/v1/support/{scope}/{id}/timeline` | Timeline aggregation |
| POST/GET | `/api/v1/support/export/*` | Stubs (501) |

Features: `expand=timeline,summary,health,relationships,audits,statistics`; JWT RBAC; configurable throttling.

Deliverable

Production-ready HTTP boundary for M5.7 Dashboard — 18 API tests, full suite **515 passed**.

See [`support_trace/docs/SUPPORT_API.md`](../../../support_trace/docs/SUPPORT_API.md).

⸻

Milestone 5.7 — Production Incident Reconstruction Engine

**Status: Complete**

Objective

Automatically reconstruct complete operational and clinical journeys from a single identifier.

Entry point: `IncidentReconstructionService` → `IncidentReport` with failure, retry, duration, impact, graph, narrative, and recommendations.

Deliverable

Production incident intelligence layer — 83 incident tests, full suite **598 passed**.

See [`support_trace/docs/INCIDENT_RECONSTRUCTION.md`](../../../support_trace/docs/INCIDENT_RECONSTRUCTION.md).

⸻

Milestone 5.8 — Observability Integration Framework

**Status: Complete**

Objective

Link Support Trace records to operational runtime context and CloudWatch console URLs (references only — no log duplication or AWS API queries).

Deliverable

`runtime_metadata` JSONField, `support_trace/runtime/` package, REST `expand=runtime`. 24 runtime tests.

See [`support_trace/docs/RUNTIME_CONTEXT.md`](../../../support_trace/docs/RUNTIME_CONTEXT.md).

⸻

Milestone 5.9 — Support Trace Platform Certification

**Status: Complete**

Objective

Certify the full Support Trace platform (M5.1–M5.8) via orchestrated validators and golden E2E scenarios.

Deliverable

`CertificationService`, `SupportTraceCertificationReport`, 27 certification tests, full suite **649 passed**. Phase 5 complete.

See [`support_trace/docs/CERTIFICATION.md`](../../../support_trace/docs/CERTIFICATION.md).

⸻

Package Structure

support_trace/
├── apps.py
├── admin.py
├── constants.py
├── enums.py
├── exceptions.py
├── models/
│   ├── trace.py
│   └── workflow_state.py
├── domain/
│   ├── builders.py
│   ├── validators.py
│   ├── repository.py
│   ├── lookup.py
│   ├── timeline.py
│   ├── search.py
│   ├── reconstruction.py
│   ├── serializers.py
│   ├── utils.py
│   └── context.py
├── services/
│   ├── support_trace_service.py
│   ├── timeline_service.py
│   ├── search_service.py
│   └── incident_service.py
├── api/
│   ├── views.py
│   ├── serializers.py
│   └── urls.py
├── certification/
│   ├── certification_service.py
│   ├── timeline_validator.py
│   ├── lookup_validator.py
│   ├── correlation_validator.py
│   └── performance_validator.py
├── tests/
└── docs/

⸻

Documentation Deliverables

Each milestone should produce documentation, just like the Clinical Audit and Business Audit phases.

Milestone	Documentation
M5.1	SUPPORT_TRACE.md, DATA_MODEL.md, ARCHITECTURE.md
M5.2	WORKFLOW_STATE.md, STATE_MACHINE.md
M5.3	IDENTIFIER_INDEX.md, SEARCH_INDEX.md
M5.4	TIMELINE_ENGINE.md, TIMELINE_EVENT.md, TIMELINE_ADAPTERS.md, TIMELINE_MERGING.md
M5.5	INVESTIGATION_ENGINE.md, INVESTIGATION_POLICY.md, LOOKUP_APIS.md
M5.6	SUPPORT_API.md, SEARCH_API.md, WORKFLOW_API.md, TIMELINE_API.md, AUTHORIZATION.md
M5.7	INCIDENT_RECONSTRUCTION.md, INCIDENT_ENGINE.md, WORKFLOW_GRAPH.md, RECONSTRUCTION_EXAMPLES.md
M5.8	CLOUDWATCH_INTEGRATION.md, RUNTIME_CONTEXT.md, LOGGER_INTEGRATION.md, CELERY_CONTEXT.md, DEPLOYMENT_METADATA.md
M5.9	CERTIFICATION.md, CERTIFICATION_CHECKLIST.md, CERTIFICATION_REPORT.md, PERFORMANCE_TARGETS.md, PRODUCTION_READINESS.md, END_TO_END_VALIDATION.md

⸻

Recommended Implementation Order

1. M5.1 – Build the Support Trace foundation (models, repository, service, immutable index).
2. M5.2 – Implement workflow state management and lifecycle synchronization.
3. M5.3 – Create the business identifier indexing layer.
4. M5.4 – Build the timeline aggregation engine that merges Clinical and Business Audit.
5. M5.5 – Develop the Trace Lookup Service with unified search logic.
6. M5.6 – Expose production-ready search and lookup REST APIs.
7. M5.7 – Implement automatic incident reconstruction and failure summaries.
8. M5.8 – Integrate Support Trace with CloudWatch and structured application logs.
9. M5.9 – Add certification, performance validation, regression tests, and complete documentation.

One architectural recommendation

One refinement I recommend before implementation is to make Support Trace the only mutable component in the observability platform.

* Clinical Audit remains immutable and legally compliant.
* Business Audit remains immutable and records operational history.
* Support Trace is the only component that updates as workflows progress, maintaining the latest state, indexes, and links.

This clear separation keeps audit data compliant and append-only while giving production support fast lookups and current workflow status without scanning large audit tables. It also provides a strong foundation for future capabilities such as OpenSearch indexing, AI-assisted investigations, and operational dashboards.
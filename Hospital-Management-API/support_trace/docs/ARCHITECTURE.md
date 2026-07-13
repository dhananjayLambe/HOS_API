# Support Trace Architecture

## Positioning

Support Trace is the **only mutable** observability layer in the production logging stack. It is **not** a source of truth — it is a **materialized workflow projection** that can always be rebuilt from immutable audit history.

| Layer | Role | Mutability | Source of truth? |
|-------|------|------------|------------------|
| Clinical Audit (M3) | What clinical activity happened | Immutable | **Yes** |
| Business Audit (M4) | How operational workflows executed | Immutable | **Yes** |
| **Support Trace (M5.1)** | Where everything is; fast lookup | **Mutable projection** | **No** |

```
Clinical Audit  ──┐
                  ├──► Projection Engine ──► SupportTrace (mutable index)
Business Audit  ──┘
```

M5.1 builds the projection framework. M5.8 adds runtime linking; M5.9 certifies the full platform.

## Package layout

```
support_trace/
  apps.py, admin.py
  constants.py, enums.py, exceptions.py
  models/trace.py
  domain/
    builders.py, validators.py, repository.py, types.py
    context.py, lookup_keys.py, workflow_relationships.py
    sync_event.py           # SupportTraceSyncEvent contract (M5.2 consumer stub)
    fingerprint.py          # workflow_fingerprint computation
    serializers.py          # internal DTO serialization only (not REST)
  services/
    support_trace_service.py
    projection_engine.py    # thin orchestrator: SyncEvent → record() (M5.1 stub)
  identifiers/              # M5.3 Identifier Resolution Framework
  timeline/                 # M5.4 Timeline Aggregation Engine (read-only)
    adapters/, timeline_engine.py, timeline_service.py
  lookup/                   # M5.5 Support Investigation Engine
  api/                      # M5.6 REST API platform (facade, contracts, serializers/v1)
  incident/                 # M5.7 Production Incident Reconstruction Engine
  runtime/                  # M5.8 Observability Integration (runtime_metadata, CloudWatch links)
  certification/            # M5.9 Platform Certification orchestrator
  migrations/
  docs/
  tests/
```

Registered in `main/settings.py` after `business_audit.apps.BusinessAuditConfig`.

## Write path (M5.2 + M5.3)

```
SupportTraceSyncEvent (ProjectionEvent)
        │
        ▼
ProjectionEngine.project()
        │
        ▼
WorkflowSyncService.sync()
        │
        ├── WorkflowResolver / ParentResolver
        ├── IdentifierSyncService (M5.3)
        │     ├── ExtractionRegistry
        │     ├── ValidationRegistry
        │     └── Accumulative merge + stats
        ├── Per-workflow registries + TransitionValidator
        └── WorkflowStateService → SupportTraceService.record()
```

## Read path — identifier resolution (M5.3)

```
lookup_any(raw)
  → IdentifierDetector → SearchPlanner → SupportTraceSearchRepository
  → RelationshipResolver → IdentifierLookupResult
```

## Read path — timeline aggregation (M5.4)

```
TimelineService.build_*_timeline()
  → TimelineRepository.fetch_bundle()
  → ClinicalAdapter / BusinessAdapter
  → Merger → Sorter → TimelineGraph → Snapshot → Statistics
  → TimelineResult (events + workflow_tree + snapshots)
```

Timeline is **read-only** — never writes audit tables or SupportTrace.

## Read path — investigation engine (M5.5)

```
TraceLookupService.investigate() / lookup_by_*()
  → InvestigationEngine (InvestigationContext + InvestigationPolicy)
  → IdentifierLookupService + TimelineRepository.fetch_bundle
  → TimelineEngine.build_from_bundle
  → SummaryBuilder + HealthBuilder + StatisticsBuilder
  → TraceLookupResult
```

**Production support entry point** — M5.6+ HTTP clients use `/api/v1/support/`.

## HTTP path (M5.6)

```
GET /api/v1/support/search?q=
  → SupportInvestigationFacade
  → TraceLookupService
  → ApiEnvelope + investigation_id
```

See [SUPPORT_API.md](SUPPORT_API.md).

Hooks on `BusinessAuditService` / `ClinicalAuditService` build SyncEvents after commit. Domain modules never write Support Trace.

## Separation of concerns

| Component | Responsibility |
|-----------|----------------|
| **Hooks** | Build SyncEvent after audit commit |
| **ProjectionEngine** | Route SyncEvent to projection consumers |
| **WorkflowSyncService** | Orchestrate resolve → map → validate → update |
| **Registries** | Action → state / step / TraceStatus |
| **IdentifierSyncService** | Extract, normalize, validate, accumulative merge |
| **IdentifierLookupService** | `lookup_any()` universal resolution |
| **TimelineService** | Read-only chronological aggregation (M5.4) |
| **TimelineRepository** | Batch `fetch_bundle()` over audits + traces |
| **TraceLookupService** | Canonical investigation orchestration (M5.5) |
| **SupportInvestigationFacade** | API facade over TraceLookupService (M5.6) |
| **IncidentReconstructionService** | Incident intelligence layer over M5.5 (M5.7) |
| **InvestigationEngine** | Pipeline via `InvestigationContext` |
| **Service** | duration_ms, workflow_health, sync_status, fail-open |
| **Repository** | Mutable upsert; `bulk_upsert` for rebuild |

## Concurrency

- **Natural key:** `workflow_instance_id` (unique constraint)
- **Row lock:** `select_for_update(skip_locked=False)` inside `transaction.atomic()`
- **Optimistic version:** `trace_version` incremented on every update
- **Service retry:** one automatic retry on concurrency conflict

## Incident path (M5.7)

```
booking_id / correlation_id
  → IncidentReconstructionService
  → ReconstructionEngine
  → TraceLookupService + analyzers
  → IncidentReport
```

See [INCIDENT_RECONSTRUCTION.md](INCIDENT_RECONSTRUCTION.md).

## Out of scope (M5.8+)

- CloudWatch adapter (M5.8)
- Certification + projection rebuild backfill (M5.9)

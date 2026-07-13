# Support Trace Framework

Mutable workflow projection and identifier index for production support investigations.

## Milestones

| Milestone | Status |
|-----------|--------|
| M5.1 Foundation | **Complete** |
| M5.2 Workflow State Management | **Complete** |
| M5.3 Identifier Resolution Framework | **Complete** |
| M5.4 Timeline Aggregation Engine | **Complete** |
| M5.5 Support Investigation Engine | **Complete** |
| M5.6 Support Investigation REST API | **Complete** |
| M5.7 Production Incident Reconstruction Engine | **Complete** |
| M5.8 Observability Integration Framework | **Complete** |
| M5.9 Support Trace Platform Certification | **Complete** |

**Phase 5 complete.**

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — projection model, separation of concerns
- [PROJECTION.md](PROJECTION.md) — source of truth rules, rebuildability, `projection_version`
- [PROJECTION_MODEL.md](PROJECTION_MODEL.md) — CQRS projection, SyncEvent, ProjectionEngine
- [SYNC_EVENT.md](SYNC_EVENT.md) — `SupportTraceSyncEvent` contract
- [WORKFLOW_SYNC.md](WORKFLOW_SYNC.md) — automatic audit → trace sync
- [WORKFLOW_STATE.md](WORKFLOW_STATE.md) — WorkflowStateService, snapshot, duration
- [STATE_MACHINE.md](STATE_MACHINE.md) — per-workflow FSMs
- [STATE_REGISTRY.md](STATE_REGISTRY.md) — action → state registries
- [TRANSITION_RULES.md](TRANSITION_RULES.md) — transition validation
- [DATA_MODEL.md](DATA_MODEL.md) — schema, sync metadata, fingerprint
- [WORKFLOW_MODEL.md](WORKFLOW_MODEL.md) — hierarchy, `workflow_depth`, TraceStatus
- [IDENTIFIER_INDEX.md](IDENTIFIER_INDEX.md) — M5.3 identifier sync + lookup
- [IDENTIFIER_STRATEGY.md](IDENTIFIER_STRATEGY.md) — strategy pattern, extension guide
- [IDENTIFIER_REGISTRY.md](IDENTIFIER_REGISTRY.md) — split registries, facade
- [IDENTIFIER_LOOKUP.md](IDENTIFIER_LOOKUP.md) — `lookup_any()` pipeline
- [SEARCH_PLANNER.md](SEARCH_PLANNER.md) — search plan steps
- [SEARCH_INDEX.md](SEARCH_INDEX.md) — `SupportTraceSearchRepository`
- [NORMALIZATION.md](NORMALIZATION.md) — canonical normalization rules
- [RELATIONSHIP_RESOLVER.md](RELATIONSHIP_RESOLVER.md) — workflow chain expansion
- [TIMELINE_ENGINE.md](TIMELINE_ENGINE.md) — M5.4 read-only timeline aggregation
- [TIMELINE_EVENT.md](TIMELINE_EVENT.md) — TimelineEvent DTO schema
- [TIMELINE_ADAPTERS.md](TIMELINE_ADAPTERS.md) — source adapter pattern
- [TIMELINE_MERGING.md](TIMELINE_MERGING.md) — merge, sort, graph
- [TIMELINE_FILTERS.md](TIMELINE_FILTERS.md) — TimelineFilter options
- [TIMELINE_PERFORMANCE.md](TIMELINE_PERFORMANCE.md) — performance targets
- [TIMELINE_EXAMPLES.md](TIMELINE_EXAMPLES.md) — patient/booking examples
- [EVENT_REGISTRY.md](EVENT_REGISTRY.md) — display registry
- [INVESTIGATION_ENGINE.md](INVESTIGATION_ENGINE.md) — M5.5 investigation orchestration
- [INVESTIGATION_POLICY.md](INVESTIGATION_POLICY.md) — depth, limits, masking
- [INVESTIGATION_RESULT.md](INVESTIGATION_RESULT.md) — TraceLookupResult schema
- [LOOKUP_APIS.md](LOOKUP_APIS.md) — public API reference
- [SUPPORT_INVESTIGATION.md](SUPPORT_INVESTIGATION.md) — support playbook
- [TRACE_LOOKUP_EXAMPLES.md](TRACE_LOOKUP_EXAMPLES.md) — booking, WhatsApp examples
- [SUPPORT_API.md](SUPPORT_API.md) — M5.6 REST API platform
- [SEARCH_API.md](SEARCH_API.md) — GET/POST search
- [WORKFLOW_API.md](WORKFLOW_API.md) — investigation endpoints
- [TIMELINE_API.md](TIMELINE_API.md) — timeline endpoints
- [AUTHORIZATION.md](AUTHORIZATION.md) — JWT roles
- [API_RESPONSES.md](API_RESPONSES.md) — envelope + investigation_id
- [API_CONTRACTS.md](API_CONTRACTS.md) — immutable contracts
- [ERROR_CODES.md](ERROR_CODES.md) — stable error codes
- [API_FILTERS.md](API_FILTERS.md) — POST search filters
- [OPENAPI.md](OPENAPI.md) — schema documentation
- [INCIDENT_RECONSTRUCTION.md](INCIDENT_RECONSTRUCTION.md) — M5.7 incident engine overview
- [INCIDENT_ENGINE.md](INCIDENT_ENGINE.md) — reconstruction pipeline
- [WORKFLOW_GRAPH.md](WORKFLOW_GRAPH.md) — typed incident graph
- [FAILURE_ANALYSIS.md](FAILURE_ANALYSIS.md) — failure detection
- [RETRY_ANALYSIS.md](RETRY_ANALYSIS.md) — retry analysis
- [IMPACT_ANALYSIS.md](IMPACT_ANALYSIS.md) — affected resources
- [INCIDENT_SUMMARY.md](INCIDENT_SUMMARY.md) — structured summary
- [INCIDENT_NARRATIVE.md](INCIDENT_NARRATIVE.md) — deterministic narrative
- [RECONSTRUCTION_EXAMPLES.md](RECONSTRUCTION_EXAMPLES.md) — usage examples
- [RUNTIME_CONTEXT.md](RUNTIME_CONTEXT.md) — M5.8 runtime metadata
- [CLOUDWATCH_INTEGRATION.md](CLOUDWATCH_INTEGRATION.md) — console URL links
- [LOGGER_INTEGRATION.md](LOGGER_INTEGRATION.md) — LogContext integration
- [CELERY_CONTEXT.md](CELERY_CONTEXT.md) — Celery task metadata
- [DEPLOYMENT_METADATA.md](DEPLOYMENT_METADATA.md) — deployment env vars
- [CERTIFICATION.md](CERTIFICATION.md) — M5.9 platform certification
- [CERTIFICATION_CHECKLIST.md](CERTIFICATION_CHECKLIST.md) — pre-deploy checklist
- [CERTIFICATION_REPORT.md](CERTIFICATION_REPORT.md) — report DTO
- [PERFORMANCE_TARGETS.md](PERFORMANCE_TARGETS.md) — soft SLA targets
- [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md) — Phase 5 completion
- [END_TO_END_VALIDATION.md](END_TO_END_VALIDATION.md) — golden scenarios
- [SERVICE.md](SERVICE.md) — `SupportTraceService.record()` API
- [SEARCH_FOUNDATION.md](SEARCH_FOUNDATION.md) — `search_vector`, future OpenSearch path
- [HOW_TO_USE.md](HOW_TO_USE.md) — production path is automatic sync

## Production path (M5.2)

Audit services automatically project via `on_commit`:

```
BusinessAuditService / ClinicalAuditService
  → SupportTraceSyncEvent
  → ProjectionEngine.project()
  → SupportTrace
```

Do **not** call `SupportTraceService.record()` from production modules.

## Test gate

```bash
DJANGO_SETTINGS_MODULE=main.settings_test .venv/bin/python -m pytest clinical_audit/tests business_audit/tests support_trace/tests -v
```

Current baseline: **649 passed**.

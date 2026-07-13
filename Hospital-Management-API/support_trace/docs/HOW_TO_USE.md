# How to Use Support Trace

## Production (M5.2+)

**Nothing to wire in domain modules.** Clinical and Business Audit base services automatically schedule Support Trace projection after a successful audit write:

```
Audit.record() → on_commit → SupportTraceSyncEvent → ProjectionEngine.project()
```

Production modules must **not** call `SupportTraceService.record()` or `ProjectionEngine` directly.

## Manual / test projection

```python
from support_trace.domain.sync_event import SupportTraceSyncEvent
from support_trace.enums import TraceSource, TraceStatus
from support_trace.services.projection_engine import ProjectionEngine

event = SupportTraceSyncEvent(
    workflow_instance_id=wf_id,
    workflow_type="Booking",
    resource_type="Booking",
    resource_id="ORD-001",
    organization_id=str(clinic.id),
    last_event="booking.confirmed",
    last_sequence_no=2,
    source=TraceSource.BUSINESS_AUDIT,
    audit_id=str(audit.id),
    status=TraceStatus.RUNNING,
    action="booking.confirmed",
    correlation_id=corr_id,
)
ProjectionEngine.project(event)
```

Or build from a saved audit row:

```python
event = SupportTraceSyncEvent.from_business_audit(audit)
ProjectionEngine.project(event)
```

## Lookup (M5.3)

Paste any identifier — the framework detects type and resolves workflows:

```python
from support_trace.identifiers import IdentifierLookupService

result = IdentifierLookupService.lookup_any("919876543210")
result = IdentifierLookupService.lookup_any("wamid.HBgL...")
result = IdentifierLookupService.lookup_booking(booking_uuid)

print(result.matched_field, result.confidence, result.trace_count)
for trace in result.traces:
    print(trace.workflow_instance_id, trace.status)
```

Low-level repository access (exact match only):

```python
from support_trace.domain.repository import SupportTraceRepository

repo = SupportTraceRepository()
traces = repo.find_all_by_identifier("phone_number", "919876543210")
```

## Timeline (M5.4)

Build unified chronological views from immutable audits:

```python
from support_trace.timeline import TimelineService

result = TimelineService.build_correlation_timeline(correlation_id)
result = TimelineService.build_booking_timeline(booking_id)

for event in result.events:
    print(event.timeline_sequence, event.timestamp, event.severity, event.event)

print(result.workflow_tree.as_tree())
print(result.statistics)
```

See [TIMELINE_EXAMPLES.md](TIMELINE_EXAMPLES.md).

## Investigation (M5.5) — primary support entry point

```python
from support_trace.lookup import TraceLookupService, InvestigationLevel

result = TraceLookupService.lookup_any("wamid.HBgL...")
result = TraceLookupService.lookup_by_booking(booking_id)
result = TraceLookupService.lookup_by_correlation(correlation_id)

print(result.summary.narrative.text)
print(result.health.overall)
print(result.workflow_graph.to_tree())
```

For fast status checks: `level=InvestigationLevel.BASIC`.

See [SUPPORT_INVESTIGATION.md](SUPPORT_INVESTIGATION.md).

## Incident reconstruction (M5.7)

```python
from support_trace.incident import IncidentReconstructionService, ReconstructionLevel

report = IncidentReconstructionService.reconstruct_booking(
    booking_id,
    level=ReconstructionLevel.DEEP,
)

print(report.summary.status if report.summary else "—")
print(report.failure.failure_reason if report.failure and report.failure.has_failure else "OK")
print(report.narrative)
for rec in report.recommendations:
    print(rec.action, rec.reason)
```

See [INCIDENT_RECONSTRUCTION.md](INCIDENT_RECONSTRUCTION.md).

## REST API (M5.6)

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "/api/v1/support/search?q=wamid.xxx&expand=timeline,summary"

curl -H "Authorization: Bearer $TOKEN" \
  "/api/v1/support/workflow/{workflow_id}?expand=health"
```

See [SUPPORT_API.md](SUPPORT_API.md).

## Runtime metadata (M5.8)

Traces capture `runtime_metadata` (CloudWatch console URL, request ID, Celery/Lambda/deployment refs) automatically on record. Expose via REST:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "/api/v1/support/workflow/{workflow_id}?expand=runtime"
```

See [RUNTIME_CONTEXT.md](RUNTIME_CONTEXT.md).

## Platform certification (M5.9)

```python
from support_trace.certification import CertificationService

report = CertificationService.run(
    workflow_id=wf_id,
    booking_id=booking_id,
    correlation_id=corr_id,
)
print(report.certification_status, report.overall_score)
```

See [CERTIFICATION.md](CERTIFICATION.md).

## Test cleanup

`purge_test_data()` in `support_trace/tests/test_utils.py` is test-only. No production `delete()`.

## Related

- [WORKFLOW_SYNC.md](WORKFLOW_SYNC.md)
- [PROJECTION_MODEL.md](PROJECTION_MODEL.md)
- [STATE_REGISTRY.md](STATE_REGISTRY.md)

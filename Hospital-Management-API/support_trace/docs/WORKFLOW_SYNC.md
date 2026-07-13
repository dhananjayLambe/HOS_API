# Workflow Sync

## Canonical path

```
Audit.record() success
  → on_commit hook (workflow/hooks.py)
  → SupportTraceSyncEvent (ProjectionEvent)
  → ProjectionEngine.project(event)
  → WorkflowSyncService.sync(event)
  → resolvers + registry + transition validator
  → WorkflowStateService.update_workflow_state(...)
  → SupportTraceService.record(...)
```

## Hook attachment

Wired only in:

- `BusinessAuditService.record()` — `schedule_workflow_state_update_from_business_audit`
- `ClinicalAuditService.record()` — `schedule_workflow_state_update_from_clinical_audit`

Domain modules never import Support Trace.

## Fail-open

- Hook scheduling failures are swallowed/logged.
- Projection failures never raise into audit callers (`raise_on_failure=False`).
- Audit history remains the source of truth; projection can be rebuilt in M5.3.

## Clinical identity

| Workflow | workflow_instance_id |
|----------|----------------------|
| Consultation | `clinical:consultation:{id}` |
| Prescription | `clinical:prescription:{id}` |
| Diagnostic Report | `clinical:report:{id}` |

Organization ID for clinical audits is read from `new_value._meta.organization_id`.

## M5.3 rebuild

Replay ClinicalAudit + BusinessAudit rows → `SupportTraceSyncEvent.from_*_audit` → `ProjectionEngine.project` — same path, no duplicated logic.

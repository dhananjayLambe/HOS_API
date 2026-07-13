# Investigation Policy

`InvestigationPolicy` centralizes expansion rules, limits, and permissions.

## Fields

- `max_graph_depth` — workflow hierarchy depth cap
- `max_relationship_expansion` — related trace limit
- `max_timeline_events` / `max_audit_rows` — payload caps
- `allowed_workflow_types` — restrict expansion (patient investigations)
- `mask_patient_pii` — privacy flag for summaries
- `role` — `support` | `admin`

## Presets

```python
from support_trace.lookup import InvestigationPolicy

InvestigationPolicy.for_patient_investigation()  # depth=4, mask PII
InvestigationPolicy.for_admin()                  # depth=10, no masking
InvestigationPolicy.default()
```

## Level → options

`policy.apply_level(InvestigationLevel.BASIC)` returns `InvestigationOptions` with timeline/audits disabled.

# Timeline Event DTO

Canonical `TimelineEvent` — all sources project into this model.

## Schema

| Field | Description |
|-------|-------------|
| `timeline_event_id` | Stable UUID5 from `reference_type + reference_id + timestamp` |
| `timestamp` | Event time (clinical: `timestamp`/`occurred_at`; business: `started_at`/`created_at`) |
| `timeline_sequence` | Monotonic 1..N assigned at merge — UI never re-sorts |
| `event` | Display title from `event_registry.py` |
| `category` | CLINICAL, BUSINESS, WORKFLOW, COMMUNICATION, DECISION, SYSTEM, SECURITY |
| `severity` | INFO, WARNING, ERROR, CRITICAL |
| `tags` | e.g. `("booking", "whatsapp", "retry")` |
| `source` | ClinicalAudit or BusinessAudit |
| `workflow_instance_id` | Business audit workflows |
| `parent_workflow_instance_id` | Nested workflow parent |
| `correlation_id` | Patient journey correlation |
| `reference_id` / `reference_type` | Audit row identity |
| `sequence_no` | Native business audit sequence |
| `action` | Raw action key for filtering |
| `display_icon` / `display_color` | UI prep from registry |

## Mapping rules

### Clinical Audit

- Category: CLINICAL (SECURITY for `authentication.*`)
- Timestamp: `new_value._meta.occurred_at` preferred over `timestamp`
- Actor: `user_id` or `source`

### Business Audit

- Category: from registry or inferred from `category`/`action`
- Timestamp: `started_at` or `created_at`
- State: `state_before` / `state_after` from row

SupportTrace does **not** produce history `TimelineEvent` rows — only `WorkflowSnapshot` enrichment.

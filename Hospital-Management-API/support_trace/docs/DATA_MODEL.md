# Data Model

Table: `support_trace` — mutable workflow projection index.

## Identity and versioning

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID PK | Database primary key |
| `trace_version` | PositiveInteger | Optimistic concurrency; incremented on update |
| `projection_version` | PositiveInteger | Default `1`; tracks projection logic version |
| `workflow_fingerprint` | Char(71) | `sha256:<digest>` — see [PROJECTION.md](PROJECTION.md) |

## Workflow identity

| Field | Type | Notes |
|-------|------|-------|
| `correlation_id` | Char(64) | Indexed; links to request trace |
| `request_id` | Char(64) | Optional request identifier |
| `workflow_instance_id` | Char(64) | **Unique** natural key for upsert |
| `parent_workflow_instance_id` | Char(64) | Parent in workflow hierarchy |
| `workflow_depth` | SmallInt | 0=Recommendation, 1=Booking, 2=Routing, 3=Delivery |
| `workflow_type` | Char | `WorkflowType` choices |
| `resource_type` | Char(32) | `BusinessResourceType` choices |
| `resource_id` | Char(128) | Primary business resource |
| `organization_id` | Char(64) | Clinic / tenant |

## Workflow state

| Field | Type | Notes |
|-------|------|-------|
| `status` | Char | `TraceStatus` — Started, Running, Waiting, Completed, Failed, Cancelled, Expired |
| `current_state` | Char(64) | Domain-specific state label |
| `workflow_step` | Char(64) | Current step (not `current_step`) |
| `last_event` | Char(128) | Human-readable event label |
| `last_sequence_no` | PositiveInteger | Mirrors Business Audit `sequence_no` |

## Sync metadata

| Field | Type | Notes |
|-------|------|-------|
| `last_source` | Char | `TraceSource` — ClinicalAudit, BusinessAudit, Manual, System |
| `sync_status` | Char | `SyncStatus` — Pending, Indexed, Failed, Retry |
| `workflow_health` | Char(16) | `WorkflowHealth` — derived in service |

## Time tracking

| Field | Type | Notes |
|-------|------|-------|
| `first_event_at` | DateTime | First indexed event |
| `last_event_at` | DateTime | Most recent activity |
| `started_at` | DateTime | Workflow start (set on create) |
| `completed_at` | DateTime | Terminal success only |
| `duration_ms` | PositiveInteger | **Computed in service** on Completed |
| `retry_count` | PositiveInteger | Default `0` |

## Audit references

| Field | Type | Notes |
|-------|------|-------|
| `last_clinical_audit_id` | UUID | Latest Clinical Audit record |
| `last_business_audit_id` | UUID | Latest Business Audit record |

## Search foundation

| Field | Type | Notes |
|-------|------|-------|
| `search_vector` | JSONField | Default `{}`; normalized lookup tokens — see [SEARCH_FOUNDATION.md](SEARCH_FOUNDATION.md) |
| `current_snapshot` | JSONField | Default `{}`; latest-only support view (lab, channel, retry_reason) |

## Extended identifier index

All nullable `Char(128)` unless noted:

| Field | Indexed |
|-------|---------|
| `patient_account_id` | Yes |
| `patient_profile_id` | No |
| `consultation_id` | Yes |
| `encounter_id` | No |
| `recommendation_id` | Yes |
| `booking_id` | Yes |
| `routing_id` | No |
| `report_id` | Yes |
| `prescription_id` | No |
| `payment_id` | No |
| `invoice_id` | No |
| `laboratory_id` | No |
| `branch_id` | No |
| `provider_reference` | Yes |
| `whatsapp_message_id` | Yes |
| `phone_number` | Yes (Char 20) |

See [IDENTIFIER_INDEX.md](IDENTIFIER_INDEX.md) for lookup patterns.

## Timestamps

| Field | Notes |
|-------|-------|
| `created_at` | `auto_now_add` |
| `updated_at` | `auto_now` |

## Indexes

Named with `st_` prefix (max 30 characters):

- `st_fingerprint_idx` — `workflow_fingerprint`
- `st_parent_idx` — `parent_workflow_instance_id`
- `st_corr_upd_idx` — `correlation_id, updated_at`
- `st_wf_upd_idx` — `workflow_instance_id, updated_at`
- `st_resource_idx` — `resource_type, resource_id`
- `st_patient_upd_idx` — `patient_account_id, updated_at`
- `st_sync_upd_idx` — `sync_status, updated_at`
- `st_org_idx` — `organization_id`
- `st_status_idx` — `status`
- `st_sync_idx` — `sync_status`
- `st_health_idx` — `workflow_health`
- `st_source_idx` — `last_source`

Plus field-level `db_index=True` on high-traffic identifier columns.

## Migration

`support_trace/migrations/0001_initial.py` — created via `makemigrations`.

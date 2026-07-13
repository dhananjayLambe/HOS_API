# Data Model

**Table:** `business_audit`  
**Insert timestamp:** `created_at` (auto_now_add — not workflow start time)

## Identity and tracing

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `created_at` | DateTime | Row insert time |
| `correlation_id` | Char(36) | Required — patient/request journey |
| `request_id` | Char(64) | Nullable — from LogContext |
| `workflow_type` | Char enum | Definition: Recommendation, Booking, … |
| `workflow_instance_id` | Char(36) | Required — runtime execution UUID |
| `parent_workflow_instance_id` | Char(36) | Nullable — nested workflow parent |
| `sequence_no` | PositiveInteger | Required — monotonic per instance |

## Event semantics

| Column | Notes |
|---|---|
| `category` | `EventCategory` |
| `action` | Machine ID e.g. `workflow.started` |
| `event` | Human label |
| `domain` / `service` / `operation` | Observability axes |

## Resource (no per-entity columns)

| Column | Notes |
|---|---|
| `resource_type` | `BusinessResourceType` |
| `resource_id` | Primary business resource ID |

## Lifecycle

| Column | Notes |
|---|---|
| `status` | `WorkflowStatus` |
| `outcome` | `WorkflowOutcome` |
| `state_before` / `state_after` | Workflow state transitions |

## Execution and provider

| Column | Notes |
|---|---|
| `started_at` / `finished_at` | Step timing |
| `execution_time_ms` | Stored duration |
| `retry_count` / `max_retry` / `retry_reason` | Retry metadata |
| `external_provider` / `provider_reference` | Third-party correlation |
| `provider_response_code` / `provider_response_message` | Provider diagnostics |

## Payload

| Column | Notes |
|---|---|
| `new_value` | JSON envelope: `_meta` + optional `payload` |
| `remarks` | Optional free text |

No separate `previous_value` column — state transitions use `state_before` / `state_after`.

## Indexes (prefix `ba_`)

| Index | Fields |
|---|---|
| Primary ordered timeline | `(workflow_instance_id, sequence_no)` |
| Instance timeline | `(workflow_instance_id, created_at)` |
| Nested workflows | `(parent_workflow_instance_id, created_at)` |
| Patient journey | `(correlation_id, created_at)` |
| Workflow type | `(workflow_type, created_at)` |
| Provider lookup | `(provider_reference)` |
| Domain / category / status | `(domain, created_at)`, `(category, created_at)`, `(status, created_at)` |
| Resource | `(resource_type, resource_id)` |
| Action | `(action, created_at)` |
| Time range | `(created_at)` |

## Immutability

- Model `save()` blocks updates to existing rows
- Model `delete()` always raises
- QuerySet `update()` and `delete()` raise

## Envelope schema (`new_value._meta`)

Includes `schema_version`, `builder_version`, `workflow_instance_id`, `correlation_id`, `domain`, `service`, `operation`, execution/retry fields, `tenant`, `environment`, `deployment`, and `organization_id`.

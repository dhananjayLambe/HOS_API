# Event Model

## action vs event

| Field | Type | Purpose |
|---|---|---|
| `action` | Machine enum (`BusinessAuditAction`) | Stable identifier for queries and dashboards |
| `event` | Human string (max 128) | Display label, e.g. "WhatsApp Recommendation Sent" |

M4.1 framework actions:

- `workflow.started`
- `workflow.queued`
- `workflow.running`
- `workflow.completed`
- `workflow.failed`
- `workflow.retrying`
- `workflow.cancelled`
- `workflow.timed_out`
- `workflow.skipped`

Module-specific actions arrive in M4.2+.

## category

`EventCategory` groups events for operational dashboards:

Recommendation, Notification, Booking, Payment, Integration, Routing, Delivery, Laboratory, Marketplace.

## status vs outcome

| Field | Enum | Meaning |
|---|---|---|
| `status` | `WorkflowStatus` | Where the workflow is in its lifecycle |
| `outcome` | `WorkflowOutcome` | Result of the step or workflow |

**Example:** A delivery workflow reaches `status=Completed` with `outcome=Failure` when the orchestrator finished but the provider rejected the message.

### WorkflowStatus values

Started, Queued, Running, Succeeded, Failed, Cancelled, Retrying, TimedOut, Skipped, Completed

### WorkflowOutcome values

Success, Failure, Partial, Unknown (default)

## State transitions

Use top-level columns for workflow state:

| Column | Example |
|---|---|
| `state_before` | `Queued` |
| `state_after` | `Running` |

Arbitrary diagnostic context belongs in `payload` inside the JSON envelope, not in state columns.

## Observability axes

| Field | Example |
|---|---|
| `domain` | `notifications` |
| `service` | `WhatsAppService` |
| `operation` | `send_recommendation` |

These replace Clinical Audit's `module` field for searchable operational telemetry.

## Actor and provider

- `actor_type`: Doctor, Patient, System, Celery, Webhook, etc.
- `external_provider` + `provider_reference`: third-party correlation
- `provider_response_code` / `provider_response_message`: production debugging

## Execution metadata

| Field | Purpose |
|---|---|
| `started_at` / `finished_at` | Step timing (stored at write time) |
| `execution_time_ms` | Derived or explicit duration |
| `retry_count` / `max_retry` / `retry_reason` | Celery/orchestrator retry support |

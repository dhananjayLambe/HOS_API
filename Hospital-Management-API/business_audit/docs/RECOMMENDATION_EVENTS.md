# Recommendation Business Audit Events

## Actions

| Action | Label | Typical status | Typical outcome |
|--------|-------|----------------|-----------------|
| `recommendation.generated` | Recommendation generated | Completed / Failed | Success / Failure |
| `workflow.queued` | WhatsApp recommendation queued | Queued | Unknown |
| `recommendation.sent` | Recommendation sent to Meta | Running | Success |
| `recommendation.delivered` | Recommendation delivered | Completed | Success |
| `recommendation.read` | Recommendation read | Completed | Success |
| `recommendation.failed` | Recommendation delivery failed | Failed | Failure |
| `recommendation.retried` | Recommendation delivery retried | Retrying | Unknown |
| `recommendation.expired` | Recommendation expired | Completed | Failure |

## Idempotency keys

| Event | Dedup key |
|-------|-----------|
| `generated` | `resource_id` + action |
| `queued` | `provider_reference=queue:{whatsapp_message_id}` |
| `sent` | `provider_reference=meta_message_id` |
| `delivered` | `provider_reference={meta_message_id}:delivered` |
| `read` | `provider_reference={meta_message_id}:read` |
| `failed` | `provider_reference={meta_message_id}:{error_code}` |
| `retried` | `resource_id` + action + `retry_count` |
| `expired` | `resource_id` + action |

## Payload fields

Every payload includes:

- `operational_stage`: `generation` | `marketplace` | `delivery`
- `recommendation_id`, `consultation_id`, `encounter_id`
- `patient_account_id`, `patient_profile_id`
- `recommendation_engine_version`
- `downstream_systems`

Generated events additionally include:

- `marketplace`, `laboratory_id`, `branch_id`
- `package_count`, `recommended_tests`, `recommended_packages`
- `quoted_price`, `collection_mode`, `expires_at`
- `available`, `failure_reason`, `source_path`

Delivery events include:

- `whatsapp_message_id`, `meta_message_id`
- `provider_status`, `template_name`
- `failure_reason`, `retry_count`, `retry_reason`

## Provider metadata

Top-level columns:

- `external_provider`: Meta, Internal
- `provider_reference`: Meta message ID or composite webhook key
- `provider_response_code`, `provider_response_message`

## State transitions

Use `state_before` / `state_after` columns:

| Transition | before → after |
|------------|----------------|
| Generated | → Generated |
| Queued | Generated → Queued |
| Sent | Queued → Sent |
| Delivered | Sent → Delivered |
| Read | Delivered → Read |
| Failed | Running/Queued → Failed |
| Retried | status=retry → Retrying |
| Expired | Active → Expired |

Snapshots for retried (required) and failed (optional) are encoded in state columns.

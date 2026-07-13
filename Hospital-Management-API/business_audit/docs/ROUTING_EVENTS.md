# Routing Events

## Actions

| Action | FSM transition |
|--------|----------------|
| `routing.started` | `None → Started` |
| `routing.rule_evaluated` | `Started → RuleEvaluated` |
| `routing.lab_matched` | `RuleEvaluated → Matched` |
| `routing.price_compared` | `Matched → Compared` |
| `routing.discount_applied` | `Compared → Discounted` |
| `routing.lab_assigned` | `Discounted/Compared → Assigned` |
| `routing.failed` | `* → Failed` |
| `routing.manual_override` | `Assigned → Assigned` |

## Idempotency (keyed by `decision_id`)

| Event | Guard |
|-------|-------|
| `started` through `discount_applied` | One per `decision_id` |
| `lab_assigned` | One per `decision_id` |
| `failed` | One per `decision_id` |
| `manual_override` | `decision_id + override_version` |

Multiple `decision_id` values may exist per `routing_id` across retry attempts.

## Payload identity fields

Every event payload includes:

- `decision_id`
- `routing_id`
- `booking_id` (nullable for marketplace)
- `attempt_number`
- `execution_time_ms` (per-stage where applicable)

Terminal events add `decision_snapshot` when required.

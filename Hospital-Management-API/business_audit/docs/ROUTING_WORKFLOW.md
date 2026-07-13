# Routing Workflow

## Hierarchy

```
Recommendation workflow
  └── Booking workflow (booking_id)
        └── Routing workflow (routing_id)
              └── Decision attempt (decision_id)
```

- Post-booking: `routing_id = RoutingRun.id`, `parent = booking_id`
- Marketplace-only: ephemeral `routing_id`, `parent = recommendation_id` (consultation)

## Retry model

Each routing retry generates a new `decision_id`. `attempt_number` increments from prior `RoutingRun` count for the order.

## Event sequence (success)

1. `routing.started` — RoutingRun created
2. `routing.rule_evaluated` — eligibility rules applied
3. `routing.lab_matched` — eligible candidates discovered
4. `routing.price_compared` — hybrid ranking complete
5. `routing.discount_applied` — optional when savings/discount > 0
6. `routing.lab_assigned` — winner persisted with mandatory snapshot

## Event sequence (no match)

1–4 as above, then `routing.failed` with partial snapshot and `rejected_labs`.

## Marketplace path

`LabRecommendationService.recommend` emits the same sequence with `provider_response` block and ephemeral IDs.

## FSM reference

See [DECISION_STATE_MACHINE.md](DECISION_STATE_MACHINE.md).

# Routing Audit (Use Case #1)

Laboratory routing is the first Decision Engine Audit implementation.

## Service

`RoutingAuditService` — eight `emit_*` methods:

- `emit_started`
- `emit_rule_evaluated`
- `emit_lab_matched`
- `emit_price_compared`
- `emit_discount_applied`
- `emit_discount_applied` (skipped when discount = 0)
- `emit_lab_assigned` (mandatory snapshot)
- `emit_failed`
- `emit_manual_override` (mandatory snapshot)

## Record contract

- `workflow_type = Routing`
- `workflow_instance_id = routing_id`
- `resource_type = Decision`, `resource_id = decision_id`
- `parent_workflow_instance_id = booking_id` or `recommendation_id`
- Payload always includes `decision_id`, `routing_id`, `booking_id`, `attempt_number`

## Integrations

| Path | Module | Hook |
|------|--------|------|
| Post-booking | `RoutingService`, `AssignmentService` | `schedule_routing_decision_*` |
| Marketplace | `LabRecommendationService.recommend` | `schedule_marketplace_routing_decision` |
| Manual override | Assignment helpdesk / `AssignmentType.MANUAL` | `schedule_routing_business_manual_override` |

`RoutingRun.metadata` stores `decision_id` and `attempt_number` (additive JSON).

## Booking complement

Lab reassignment still emits `booking.modified` via `schedule_booking_business_modified_lab_reassignment` for the booking FSM. Decision audit captures the routing *why*.

## Related

- [ROUTING_EVENTS.md](ROUTING_EVENTS.md)
- [ROUTING_WORKFLOW.md](ROUTING_WORKFLOW.md)
- [ROUTING_RULES.md](ROUTING_RULES.md)

# Booking State Machine (Reference Pattern)

M4.3 establishes the **finite state machine pattern** for all future Business Workflow audits (Laboratory Routing, Home Collection, Report Delivery, Payments).

## Principles

1. Every audit record captures **both** the event action and the **state transition**
2. `state_before` and `state_after` columns store operational FSM labels
3. Snapshots capture field-level deltas for reversible/support analysis
4. Terminal states (Cancelled, Expired, Closed) emit at most once per workflow instance

## Operational states

| State | Meaning |
|-------|---------|
| Created | Order persisted, awaiting confirmation |
| Confirmed | Booking confirmed (system or slot confirmation) |
| Modified | Modification event marker (booking remains operationally active) |
| Cancelled | Terminal — booking cancelled |
| Expired | Terminal — booking expired (scheduler) |
| Closed | Terminal — booking workflow complete |

## Transition table

| From | Event | To |
|------|-------|-----|
| — | `booking.created` | Created |
| Created | `booking.confirmed` | Confirmed |
| Confirmed | `booking.modified` | Modified |
| Confirmed | `booking.cancelled` | Cancelled |
| Confirmed | `booking.closed` | Closed |
| Created | `booking.expired` | Expired |
| Confirmed | `booking.expired` | Expired |

## Modified state semantics

`Modified` is an **event marker**, not a persistent macro-state requiring re-confirmation:

- After `booking.modified`, the booking remains operationally confirmed
- The `change_snapshot` in payload carries slot/mode/lab deltas
- `modification_version` increments for idempotency (`booking_id + version`)

## Reusable template for future domains

When implementing M4.4+ business workflow audits:

1. Define FSM states in `constants.py`
2. Map every `emit_*` to explicit `state_before` / `state_after`
3. Require snapshots for modification and cancellation events
4. Enforce terminal-state idempotency in repository guards
5. Document transitions in `{DOMAIN}_STATE_MACHINE.md`

Example future domain:

```
Routing: AwaitingAssignment → Assigned → Reassigned → Completed
HomeCollection: Requested → Scheduled → InProgress → Completed
Payment: Initiated → Authorized → Captured → Refunded
```

Each domain follows the same `BookingAuditService` facade pattern established in M4.3.

# Diagnostic Booking Business Audit (M4.3)

Reference implementation for **Business Workflow audits** — mirrors M4.2 recommendation audit and M3.3 consultation audit patterns.

## Purpose

Provide a complete immutable operational audit trail for the diagnostic booking lifecycle (`DiagnosticOrder`), capturing every significant booking state transition with fail-open architecture.

**Clinical Audit** continues to record test ordered, recommendation sent, and report uploaded. **Business Audit** records operational booking workflow only.

## Domain mapping

| Concept | Implementation |
|---------|----------------|
| `booking_id` | `DiagnosticOrder.id` (UUID) |
| `workflow_instance_id` | Same as `booking_id` |
| `parent_workflow_instance_id` | `recommendation_id` from M4.2 when available |

## Package

```
business_audit/booking/
  booking_audit_service.py   # emit_created/confirmed/modified/cancelled/expired/closed
  payload_builder.py
  snapshot_builder.py
  repository.py
  hooks.py                   # ONLY integration surface for production modules
  constants.py
  types.py
```

## Integration rule

Production modules **must not** call `BusinessAuditService.record()` directly. Use `business_audit/booking/hooks.py`:

| Hook | Event |
|------|-------|
| `schedule_booking_business_created` | `booking.created` |
| `schedule_booking_business_confirmed` | `booking.confirmed` |
| `schedule_booking_business_modified` | `booking.modified` |
| `schedule_booking_business_cancelled` | `booking.cancelled` |
| `schedule_booking_business_expired` | `booking.expired` |
| `schedule_booking_business_closed` | `booking.closed` |

## Production wiring

| Module | Trigger |
|--------|---------|
| `DiagnosticOrderCreationService` | created + confirmed (non-idempotent path) |
| `visit_workflow.confirm_visit` | confirmed (deferred patient-app path) |
| `visit_workflow.reschedule_visit` | modified (slot change) |
| `RoutingAssignmentService` | modified (lab reassignment) |
| `CancellationService.cancel_order` | cancelled |
| `OrderStatusAggregationService` → COMPLETED | closed |
| `expire_stale_bookings` Celery beat | expired |

## Fail-open

All hooks wrap scheduling in try/except and log warnings. Audit failures never block booking operations.

## Nested workflow

When a booking originates from a recommendation, `DiagnosticOrder.operational_metadata.recommendation_id` and `parent_workflow_instance_id` link the booking workflow to the recommendation workflow instance.

See also: [BOOKING_EVENTS.md](BOOKING_EVENTS.md), [BOOKING_WORKFLOW.md](BOOKING_WORKFLOW.md), [BOOKING_STATE_MACHINE.md](BOOKING_STATE_MACHINE.md).

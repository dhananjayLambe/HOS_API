---
owner: appointments-team
module: appointments
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Validations — appointments

| Validation | Reason | Config |
|---|---|---|
| Slot within `MAX_BOOKING_DAYS` | Booking horizon | settings |
| Same-day lead time | `BOOKING_SLOT_LEAD_BUFFER_MINUTES` | settings |
| Slot not double-booked | Unique constraint / service check | — |
| Doctor/clinic active | Valid booking target | — |
| Reschedule to available slot | Conflict prevention | — |
| Check-in only for scheduled | Status gate | — |

## Payment (future)

`payment_status`: pending, paid, failed, refunded — validated when payment integration ships.

## Throttling

`APPOINTMENT_SLOTS_THROTTLE` on slots API — rate limit abuse.

# Booking Business Audit Events

## Action catalog

| Action | FSM transition | Stage | Snapshot |
|--------|----------------|-------|----------|
| `booking.created` | → Created | creation | No |
| `booking.confirmed` | Created → Confirmed | confirmation | No |
| `booking.modified` | Confirmed → Modified | modification | Required |
| `booking.cancelled` | * → Cancelled | cancellation | Required |
| `booking.expired` | Created/Confirmed → Expired | expiration | No |
| `booking.closed` | Confirmed → Closed | closure | Optional |

## Payload fields

Every event payload includes:

- `booking_id`, `order_number`
- `recommendation_id` (when linked)
- `consultation_id`, `encounter_id`
- `patient_account_id`, `patient_profile_id`
- `laboratory_id`, `branch_id`
- `collection_mode` (`HOME_COLLECTION` | `VISIT_LAB`)
- `collection_address` (home collection)
- `slot` (`date`, `time`)
- `price`, `discount`, `coupon` (nullable)
- `home_collection` (boolean)
- `operational_stage`
- `downstream_systems`
- `booking_engine_version`

Modified events additionally include:

- `modification_reason`
- `modification_version`
- `change_snapshot` (before/after deltas)

Cancelled events additionally include:

- `cancellation_reason`
- `cancelled_by_id`
- `prior_status`
- `change_snapshot`

## Idempotency matrix

| Event | Guard |
|-------|-------|
| `booking.created` | One per `booking_id` |
| `booking.confirmed` | One per `booking_id` |
| `booking.modified` | One per `booking_id + modification_version` |
| `booking.cancelled` | One per `booking_id` |
| `booking.expired` | One per `booking_id` |
| `booking.closed` | One per `booking_id` |

Idempotent order creation (`DiagnosticOrderCreationResult.idempotent=True`) skips created/confirmed emits.

## Repository queries

`BookingAuditRepository` provides:

- `get_by_workflow`, `get_by_booking`
- `get_by_patient`, `get_by_consultation`
- `get_by_lab`, `get_by_slot`, `get_by_collection_mode`

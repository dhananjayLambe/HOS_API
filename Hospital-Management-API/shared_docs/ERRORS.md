---
owner: platform-team
module: shared_docs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Central Error Catalogue

Shared error semantics for backend, frontend, QA, and AI tools. App-specific codes extend this in `{app}/docs/ERRORS.md`.

| Code | Reason | HTTP | User Action | Retry | Owner App |
|---|---|---|---|---|---|
| `LAB_NOT_AVAILABLE` | No active lab serves patient's pincode/area | 404 | Suggest alternate date or lab | No | diagnostics_engine |
| `BOOKING_EMPTY` | Zero tests in booking request | 400 | Add at least one test | No | diagnostics_engine |
| `INVALID_ORDER_TRANSITION` | Order status transition not allowed | 400 | Refresh order state | No | diagnostics_engine |
| `INVALID_ENCOUNTER_TRANSITION` | Encounter status transition not allowed | 400 | Refresh encounter | No | consultations_core |
| `CONSULTATION_ALREADY_COMPLETED` | Idempotent re-complete attempt | 409 | Return existing result | No | consultations_core |
| `REPORT_IMMUTABLE` | Attempt to modify delivered report | 403 | Contact support | No | diagnostics_engine |
| `UPLOAD_TARGET_WRONG_ENTITY` | Upload to assignment instead of report | 400 | Use report_id endpoint | No | diagnostics_engine |
| `LAB_ASSIGNMENT_REJECTED` | Lab rejected order assignment | 409 | Re-route order | Yes | labs |
| `COLLECTION_FAILED` | Home collection could not complete | 422 | Reschedule collection | Yes | labs |
| `WHATSAPP_DELIVERY_FAILED` | Meta API delivery failure | 502 | Retry via delivery log | Yes | notifications |
| `UNAUTHORIZED_ROLE` | User role cannot perform action | 403 | — | No | All apps |
| `SLOT_UNAVAILABLE` | Appointment slot no longer available | 409 | Pick another slot | No | appointments |

## Error response format

DRF standard: `{ "detail": "..." }` or field errors. Domain codes should appear in `detail` or custom error handler when implemented.

## Adding errors

1. Add row here with stable code
2. Implement in owning app exception/validation
3. Link from `API.md` endpoint documentation

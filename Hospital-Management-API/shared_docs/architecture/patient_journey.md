---
owner: platform-team
module: shared_docs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# End-to-End Patient Journey

Links all lifecycles across apps. Each step references owning app, status registry, and workflow docs.

| Step | Owner App | Status / Trigger | Doc Link |
|---|---|---|---|
| 1. Book appointment | appointments | `scheduled` | [appointments/docs/WORKFLOWS.md](../../appointments/docs/WORKFLOWS.md) |
| 2. Check in (queue) | queue_management | check-in event | [queue_management/docs/WORKFLOWS.md](../../queue_management/docs/WORKFLOWS.md) |
| 3. Encounter created | consultations_core | `created` | [status_registry.md](../status_registry.md#encounter-status) |
| 4. Pre-consultation | consultations_core | `pre_consultation_in_progress` | [consultations_core/docs/WORKFLOWS.md](../../consultations_core/docs/WORKFLOWS.md) |
| 5. Consultation | consultations_core | `consultation_in_progress` | [consultations_core/docs/WORKFLOWS.md](../../consultations_core/docs/WORKFLOWS.md) |
| 6. Investigation ordered | consultations_core | `ordered` | [consultations_core/docs/BUSINESS_FLOW.md](../../consultations_core/docs/BUSINESS_FLOW.md) |
| 7. Diagnostic order created | diagnostics_engine | `created` | [diagnostics_engine/docs/WORKFLOWS.md](../../diagnostics_engine/docs/WORKFLOWS.md) |
| 8. Order confirmed | diagnostics_engine | `confirmed` | Test lines expanded |
| 9. Lab routing | diagnostics_engine | `awaiting_assignment` → `assigned` | Routing services |
| 10. Lab accepts | labs | `PENDING` → `ACCEPTED` | [labs/docs/WORKFLOWS.md](../../labs/docs/WORKFLOWS.md) |
| 11. Collection / branch visit | labs | Collection or visit workflow | [labs/docs/WORKFLOWS.md](../../labs/docs/WORKFLOWS.md) |
| 12. Sample collected | diagnostics_engine + labs | `sample_collected` | Order status update |
| 13. Processing | labs | `in_processing` | Test execution |
| 14. Report upload | diagnostics_engine | `report_id` upload API | INV-007 |
| 15. Report ready | diagnostics_engine | `ready` | Mark ready API |
| 16. Report delivered | diagnostics_engine + notifications | `delivered` | Signed URL + notify |
| 17. WhatsApp notification | notifications | delivery callback | [event_registry.md](../event_registry.md) |
| 18. Patient views report | patient_account / API | — | Patient reports API |

## Clinical vs commercial split

- **Steps 3–6:** Clinical (consultations_core)
- **Steps 7–16:** Commercial + fulfillment (diagnostics_engine + labs)
- **Steps 17–18:** Delivery (notifications + patient)

## Prescription parallel path

After step 5 (end consultation): PDF → S3 → WhatsApp → patient. See consultations_core WORKFLOWS.md.

## Future

Payment and refund steps stubbed in status_registry — not yet implemented.

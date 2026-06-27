---
owner: platform-team
module: shared_docs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# System Invariants

Rules that must never be violated. Enforced in code and tests.

| ID | Invariant | Enforced In | Tests |
|---|---|---|---|
| INV-001 | A diagnostic report cannot exist without a confirmed order/test line | `diagnostics_engine/services/reports/` | `diagnostics_engine/tests/` |
| INV-002 | A booking must contain at least one test | `diagnostics_engine` order validation | Order creation tests |
| INV-003 | A completed consultation cannot revert to draft/in-progress | `EncounterStateMachine` | `consultations_core/tests/` |
| INV-004 | WhatsApp delivery records are never deleted | `notifications/models/` | Append-only delivery logs |
| INV-005 | Diagnostic reports are immutable after delivery | `diagnostics_engine/services/reports/` | Report delivery tests |
| INV-006 | Package price is a SKU price snapshotted at booking | `DiagnosticOrderItem` | Pricing tests |
| INV-007 | Upload APIs target `report_id`, never assignment `task_id` | `diagnostics_engine/api/views/reports/` | Operational API tests |
| INV-008 | Encounter status is single source of truth — not inferred from form data | `EncounterStateMachine` | Encounter state tests |
| INV-009 | Patient DOB is immutable after creation | `patient_account` | Profile update tests |
| INV-010 | Pricing snapshots on order lines preserve amounts at booking time | `DiagnosticOrderItem` | Order confirm tests |

## Module-specific invariants

Apps may add `{app}/docs/INVARIANTS.md` for rules not listed here. Cross-app invariants belong in this file.

## Adding invariants

1. Assign next `INV-NNN` ID
2. Document enforcement location and tests
3. Reference in `AI_CONTEXT.md` for affected apps

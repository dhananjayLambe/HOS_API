---
owner: labs-team
module: labs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Validations — labs

| Validation | Reason |
|---|---|
| Assignment accept only from `PENDING` | Workflow integrity |
| Collection/visit transitions via service only | No direct status mutation |
| Branch pricing `is_available` for quotes | STRICT catalog (diagnostics_engine) |
| Pincode in `BranchServiceArea` | Geographic eligibility |
| Home collection assign requires phlebotomist | Field ops |
| Visit check-in before complete | Patient presence |

## Reject reasons

Lab may reject assignment when capacity, geography, or catalog mismatch — triggers re-routing in diagnostics_engine.

## File uploads

Report files uploaded via diagnostics_engine `report_id` endpoints, not assignment `task_id` (INV-007).

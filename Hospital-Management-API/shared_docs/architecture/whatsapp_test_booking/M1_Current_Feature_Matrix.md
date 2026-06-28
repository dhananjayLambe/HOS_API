---
owner: platform-team
module: whatsapp_test_booking
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: draft
milestone: M1
document_type: summary
---

# M1 — Current Feature Matrix

## Purpose

Quickest view of what exists in the DoctorProCare codebase today versus what Phase 1 requires.

**Legend:** ✅ Complete · ⚠️ Partial · ❌ Missing

---

## Feature Matrix

| Feature | Status | Module | Reusable | Primary doc |
|---|---|---|---|---|
| Consultation / EMR | ✅ | consultations_core | Yes | [02_End_to_End_Workflow.md](02_End_to_End_Workflow.md) |
| Investigation CRUD | ✅ | consultations_core | Yes | [04_Booking_Lifecycle.md](04_Booking_Lifecycle.md) |
| Custom investigations | ✅ | consultations_core | Yes (clinical only) | [04_Booking_Lifecycle.md](04_Booking_Lifecycle.md) |
| Package expansion (clinical snapshot) | ✅ | consultations_core | Yes | [04_Booking_Lifecycle.md](04_Booking_Lifecycle.md) |
| Package expansion (order confirm) | ✅ | diagnostics_engine | Yes | [04_Booking_Lifecycle.md](04_Booking_Lifecycle.md) |
| Investigation search | ✅ | diagnostics_engine | Yes | [04_Booking_Lifecycle.md](04_Booking_Lifecycle.md) |
| Clinical test suggestions (doctor) | ✅ | diagnostics_engine | Yes (not lab rec) | [03_Recommendation_Engine.md](03_Recommendation_Engine.md) |
| Prescription PDF | ✅ | consultations_core | Yes | [10_WhatsApp_Integration.md](10_WhatsApp_Integration.md) |
| WhatsApp prescription delivery | ✅ | notifications | Yes | [10_WhatsApp_Integration.md](10_WhatsApp_Integration.md) |
| Branch service pricing | ✅ | labs | Yes | [07_Commercial_and_Pricing.md](07_Commercial_and_Pricing.md) |
| Branch package pricing | ✅ | labs | Yes | [07_Commercial_and_Pricing.md](07_Commercial_and_Pricing.md) |
| Pricing quote service | ✅ | diagnostics_engine | Yes | [07_Commercial_and_Pricing.md](07_Commercial_and_Pricing.md) |
| XLSX service pricing import | ✅ | diagnostics_engine + labs | Yes | [07_Commercial_and_Pricing.md](07_Commercial_and_Pricing.md) |
| XLSX package pricing import | ❌ | — | — | [07_Commercial_and_Pricing.md](07_Commercial_and_Pricing.md) |
| Order price snapshots | ✅ | diagnostics_engine | Yes | [07_Commercial_and_Pricing.md](07_Commercial_and_Pricing.md) |
| Diagnostic order creation | ✅ | diagnostics_engine | Yes | [04_Booking_Lifecycle.md](04_Booking_Lifecycle.md) |
| Home collection mode selection | ✅ | diagnostics_engine | Yes | [04_Booking_Lifecycle.md](04_Booking_Lifecycle.md) |
| Eligibility engine | ✅ | diagnostics_engine | Yes | [05_Routing_and_Rerouting.md](05_Routing_and_Rerouting.md) |
| Ranking engine | ✅ | diagnostics_engine | Yes | [05_Routing_and_Rerouting.md](05_Routing_and_Rerouting.md) |
| Routing audit snapshots | ✅ | diagnostics_engine | Yes | [08_Data_Model_and_Audit.md](08_Data_Model_and_Audit.md) |
| Post-order routing assignment | ✅ | diagnostics_engine | Yes | [05_Routing_and_Rerouting.md](05_Routing_and_Rerouting.md) |
| Hypothetical eligibility (no order) | ✅ | diagnostics_engine | Yes | [03_Recommendation_Engine.md](03_Recommendation_Engine.md) |
| **Lab recommendation service** | ❌ | — | Planned M2 | [03_Recommendation_Engine.md](03_Recommendation_Engine.md) |
| **Pre-booking recommendation** | ❌ | — | Planned M2–M3 | [M1_Marketplace_Gap_Analysis.md](M1_Marketplace_Gap_Analysis.md) |
| **Recommendation REST API** | ❌ | — | Planned M3 | [M1_Marketplace_Gap_Analysis.md](M1_Marketplace_Gap_Analysis.md) |
| Lab order assignment (ops) | ✅ | labs | Yes | [06_Operations_Runbook.md](06_Operations_Runbook.md) |
| Lab accept / reject | ✅ | labs | Yes | [06_Operations_Runbook.md](06_Operations_Runbook.md) |
| Auto-reject stale assignment | ✅ | labs | Yes | [06_Operations_Runbook.md](06_Operations_Runbook.md) |
| Home collection workflow | ✅ | labs | Yes | [06_Operations_Runbook.md](06_Operations_Runbook.md) |
| Branch visit workflow | ✅ | labs | Yes | [06_Operations_Runbook.md](06_Operations_Runbook.md) |
| Test execution provisioning | ✅ | labs | Yes | [06_Operations_Runbook.md](06_Operations_Runbook.md) |
| **Automatic rerouting (max 2)** | ❌ | — | Planned M6 | [05_Routing_and_Rerouting.md](05_Routing_and_Rerouting.md) |
| **ROUTING_FAILED + patient notify** | ❌ | — | Planned M6 | [M1_Marketplace_Gap_Analysis.md](M1_Marketplace_Gap_Analysis.md) |
| Report upload APIs | ✅ | diagnostics_engine / labs | Yes | [02_End_to_End_Workflow.md](02_End_to_End_Workflow.md) |
| Report WhatsApp delivery | ⚠️ | diagnostics_engine | Partial (simulated) | [10_WhatsApp_Integration.md](10_WhatsApp_Integration.md) |
| **WhatsApp lab recommendation** | ❌ | — | Planned M4 | [10_WhatsApp_Integration.md](10_WhatsApp_Integration.md) |
| **WhatsApp booking conversation** | ❌ | — | Planned M4–M5 | [10_WhatsApp_Integration.md](10_WhatsApp_Integration.md) |
| **Booking after patient confirm** | ❌ | — | Planned M5 | [04_Booking_Lifecycle.md](04_Booking_Lifecycle.md) |
| Patient price guarantee entity | ❌ | — | Planned Phase 3 | [07_Commercial_and_Pricing.md](07_Commercial_and_Pricing.md) |
| Commercial settlement | ❌ | — | Future | [07_Commercial_and_Pricing.md](07_Commercial_and_Pricing.md) |
| Multi-lab fulfilment | ❌ | — | Out of scope P1 | [09_Future_Roadmap.md](09_Future_Roadmap.md) |

---

## Module Readiness Summary

| Module | M0 foundation | Marketplace gaps |
|---|---|---|
| consultations_core | Strong | None blocking M2 |
| diagnostics_engine | Strong | Recommendation service, API, reroute |
| labs | Strong | Reroute integration hook |
| notifications | Strong (prescription) | TEST_BOOKING, report unification |

---

## Phase 1 Requirement Coverage

| Requirement (doctor_pro_2.0) | Status |
|---|---|
| R1 Recommendation before booking | ❌ |
| R2 Complete order fulfilment | ✅ (eligibility) |
| R3 Single lab assignment | ✅ |
| R4 Automatic rerouting (max 2) | ❌ |
| R5 Patient price freeze | ⚠️ (snapshots only) |
| R6 Patient communication rules | ⚠️ (prescription only) |
| R7 Routing audit | ✅ (first attempt) |
| R8 Operational audit | ⚠️ |
| R9 Database audit source of truth | ✅ |
| R10 Future compatibility | ✅ |

---

## Next Step

For every ❌ and ⚠️ row, see recommended milestone and dependencies:

**[M1_Marketplace_Gap_Analysis.md](M1_Marketplace_Gap_Analysis.md)**

Do not start Milestone 2 until this matrix and gap analysis are approved.

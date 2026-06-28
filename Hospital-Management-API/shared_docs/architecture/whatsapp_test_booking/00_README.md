---
owner: platform-team
module: whatsapp_test_booking
version: 1.1
last_updated: 2026-06-27
reviewed_by: —
status: approved
milestone: M1
---

# DoctorProCare Diagnostics Marketplace

## Production Architecture Handbook

**Version:** 1.1  
**Status:** Approved Architecture Baseline  
**Owner:** DoctorProCare Platform Team  
**Current Milestone:** Milestone 1 — Current State Analysis

---

## Purpose

This directory is the authoritative architecture reference for the DoctorProCare Diagnostics Marketplace.

It is intended for Product, Engineering, QA, DevOps, Operations, Commercial, Solution Architects, and AI-assisted development tools (Cursor, etc.).

**Governing specifications (requirements, not implementation analysis):**

- [doctor_pro_2.0.md](doctor_pro_2.0.md) — Phase 1 production requirements
- [DoctorProCare Diagnostics Marketplace.md](DoctorProCare%20Diagnostics%20Marketplace.md) — Phase 1 production rules and operational specification
- [Delivery_Roadmap.md](Delivery_Roadmap.md) — Milestone delivery roadmap (M0–M8)
- [Deilvery_roadmap.md](Deilvery_roadmap.md) — legacy alias

If implementation differs from documented **current state**, update these documents through the ADR process rather than allowing undocumented drift. Marketplace ADRs: [DECISIONS.md](DECISIONS.md).

---

## Milestone 1 — Current State Analysis

**Objective:** Document what exists in the codebase today before any new marketplace business logic is implemented.

**Rules for Milestone 1 documents (01–08, 10–11):**

- Answer: What exists? Where? How does it work? What is reusable? What are the gaps?
- Do **not** contain detailed future implementation design.
- Each document ends with a standard footer linking to the gap analysis.

**Central gap document:** [M1_Marketplace_Gap_Analysis.md](M1_Marketplace_Gap_Analysis.md) — the single place for “what do we build next?”

**Quick status:** [M1_Current_Feature_Matrix.md](M1_Current_Feature_Matrix.md)

**Approval:** [M1_Approval_Checklist.md](M1_Approval_Checklist.md)

**Exit criteria:** All Milestone 1 documents approved. No code changes.

---

## Documentation Structure

| Document | Type | Purpose |
|---|---|---|
| [00_README.md](00_README.md) | Index | Navigation and standards |
| [01_Business_Principles.md](01_Business_Principles.md) | M1 Analysis | Principles mapped to current implementation |
| [02_End_to_End_Workflow.md](02_End_to_End_Workflow.md) | M1 Analysis | As-is patient/doctor/lab workflow |
| [03_Recommendation_Engine.md](03_Recommendation_Engine.md) | M1 Analysis | Current recommendation-related components |
| [04_Booking_Lifecycle.md](04_Booking_Lifecycle.md) | M1 Analysis | Investigations, orders, package expansion |
| [05_Routing_and_Rerouting.md](05_Routing_and_Rerouting.md) | M1 Analysis | Routing engine, snapshots, assignment |
| [06_Operations_Runbook.md](06_Operations_Runbook.md) | M1 Analysis | Lab accept/reject, collection, visit |
| [07_Commercial_and_Pricing.md](07_Commercial_and_Pricing.md) | M1 Analysis | Pricing models, quotes, snapshots |
| [08_Data_Model_and_Audit.md](08_Data_Model_and_Audit.md) | M1 Analysis | Cross-app entities and audit chain |
| [09_Future_Roadmap.md](09_Future_Roadmap.md) | Vision | Long-term marketplace evolution (not M1 analysis) |
| [10_WhatsApp_Integration.md](10_WhatsApp_Integration.md) | M1 Analysis | Current WhatsApp prescription pipeline |
| [11_Channel_Architecture.md](11_Channel_Architecture.md) | Golden Architecture | Channel-agnostic service layering |
| [M1_Current_Feature_Matrix.md](M1_Current_Feature_Matrix.md) | M1 Summary | Feature status at a glance |
| [M1_Marketplace_Gap_Analysis.md](M1_Marketplace_Gap_Analysis.md) | M1 Synthesis | All gaps → milestones, dependencies, priority |
| [M1_Approval_Checklist.md](M1_Approval_Checklist.md) | M1 Exit | Sign-off before M2 |
| [DECISIONS.md](DECISIONS.md) | ADR | Marketplace architecture decisions |
| [Delivery_Roadmap.md](Delivery_Roadmap.md) | Delivery | M0–M8 milestone plan |

---

## Reading Order (Recommended)

Follow the business flow — easiest path for new developers:

1. [00_README.md](00_README.md)
2. [01_Business_Principles.md](01_Business_Principles.md)
3. [02_End_to_End_Workflow.md](02_End_to_End_Workflow.md)
4. [08_Data_Model_and_Audit.md](08_Data_Model_and_Audit.md)
5. [04_Booking_Lifecycle.md](04_Booking_Lifecycle.md)
6. [07_Commercial_and_Pricing.md](07_Commercial_and_Pricing.md)
7. [03_Recommendation_Engine.md](03_Recommendation_Engine.md)
8. [05_Routing_and_Rerouting.md](05_Routing_and_Rerouting.md)
9. [06_Operations_Runbook.md](06_Operations_Runbook.md)
10. [10_WhatsApp_Integration.md](10_WhatsApp_Integration.md)
11. [M1_Current_Feature_Matrix.md](M1_Current_Feature_Matrix.md)
12. [M1_Marketplace_Gap_Analysis.md](M1_Marketplace_Gap_Analysis.md)
13. [DECISIONS.md](DECISIONS.md)
14. [M1_Approval_Checklist.md](M1_Approval_Checklist.md) — sign-off before M2
15. [11_Channel_Architecture.md](11_Channel_Architecture.md)
16. [09_Future_Roadmap.md](09_Future_Roadmap.md)

For **requirements and production rules**, read [doctor_pro_2.0.md](doctor_pro_2.0.md) and [DoctorProCare Diagnostics Marketplace.md](DoctorProCare%20Diagnostics%20Marketplace.md) first.

For **what to build next**, read only [M1_Marketplace_Gap_Analysis.md](M1_Marketplace_Gap_Analysis.md).

---

## Cross-Module Ownership

| Layer | Django App | Responsibility |
|---|---|---|
| Clinical | `consultations_core` | Consultation, investigation, prescription, encounter |
| Marketplace | `diagnostics_engine` | Catalog, booking, routing, pricing quotes, reports |
| Fulfilment | `labs` | Branch pricing, lab assignment, collection, execution |
| Notifications | `notifications` | WhatsApp, delivery audit |

See [shared_docs/ownership.md](../../ownership.md) for the entity ownership registry.

---

## Milestone 1 Document Footer Standard

Every M1 analysis document (01–08, 10–11) ends with:

```
## Marketplace Impact
## Milestone 2
## Reusable Components
## Known Gaps
## Reference
→ M1_Marketplace_Gap_Analysis.md
```

Future implementation detail lives **only** in [M1_Marketplace_Gap_Analysis.md](M1_Marketplace_Gap_Analysis.md) and [Delivery_Roadmap.md](Delivery_Roadmap.md).

---

## Delivery Roadmap Milestones

| Milestone | Feature | Status |
|---|---|---|
| M0 | Existing Foundation | Complete |
| **M1** | **Current State Analysis** | **Docs complete — pending approval** |
| M2 | Laboratory Recommendation Engine | Planned |
| M3 | Recommendation API | Planned |
| M4 | WhatsApp Recommendation Flow | Planned |
| M5 | Booking Flow | Planned |
| M6 | Laboratory Assignment & Re-routing | Planned |
| M7 | Report Delivery | Planned |
| M8 | Production Hardening | Planned |

---

## Tier-1 Module Documentation

- [diagnostics_engine/docs/](../../../diagnostics_engine/docs/)
- [labs/docs/](../../../labs/docs/)
- [consultations_core/docs/](../../../consultations_core/docs/)
- [notifications/docs/](../../../notifications/docs/)
- [shared_docs/architecture/diagnostics.md](../diagnostics.md)

---

## Success Criteria

This handbook succeeds when:

- Engineers implement new features without duplicating business logic.
- QA derives test scenarios from documented workflows.
- Operations understand every production state and recovery path.
- “What do we build next?” is answered by one document: [M1_Marketplace_Gap_Analysis.md](M1_Marketplace_Gap_Analysis.md).
- Milestone 2 does not begin until Milestone 1 documents are approved.

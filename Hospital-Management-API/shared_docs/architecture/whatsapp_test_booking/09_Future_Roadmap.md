---
owner: platform-team
module: whatsapp_test_booking
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
document_type: vision
---

# 09 — Future Roadmap

## Purpose

Long-term marketplace evolution vision. **Not** current-state analysis.

For what exists today: [M1_Current_Feature_Matrix.md](M1_Current_Feature_Matrix.md)  
For what to build next: **[M1_Marketplace_Gap_Analysis.md](M1_Marketplace_Gap_Analysis.md)**  
For delivery milestones: [Deilvery_roadmap.md](Deilvery_roadmap.md)

---

## Phase 1 Delivery Milestones (Engineering)

From [Deilvery_roadmap.md](Deilvery_roadmap.md):

| Milestone | Capability | Status |
|---|---|---|
| M0 | Existing foundation verified | Complete |
| M1 | Current state analysis | In progress |
| M2 | Laboratory recommendation engine (read-only) | Planned |
| M3 | Recommendation REST API | Planned |
| M4 | WhatsApp recommendation flow | Planned |
| M5 | Booking after patient confirmation | Planned |
| M6 | Lab assignment + auto reroute (max 2) | Planned |
| M7 | Report delivery (production WhatsApp) | Planned |
| M8 | Production hardening | Planned |

---

## Business Phase Roadmap

From [doctor_pro_2.0.md](doctor_pro_2.0.md) §9:

| Phase | Capability |
|---|---|
| Phase 1 | Single laboratory recommendation and booking |
| Phase 2 | WhatsApp conversational booking (covered by M4–M5) |
| Phase 3 | Commercial audit and pricing lock |
| Phase 4 | Multi-laboratory fulfilment |
| Phase 5 | Settlement and reconciliation platform |
| Future | AI routing, dynamic pricing, partner scoring, predictive ops |

---

## Explicitly Out of Scope (Phase 1)

- Multi-laboratory fulfilment
- Partial / split fulfilment
- Dynamic repricing
- Commercial settlement engine
- AI routing
- Laboratory capacity prediction

---

## Future Capabilities (Architecture-Ready)

The Phase 1 data model and audit chain are designed to support these without redesign:

| Capability | Foundation today | Gap doc |
|---|---|---|
| Pre-booking recommendation | `evaluate_requirements`, ranking engines | GAP-001 |
| Multi-attempt routing | `RoutingRun`, event enum | GAP-007 |
| Patient price lock | Order snapshots | GAP-010 |
| Channel expansion | Channel architecture doc | [11_Channel_Architecture.md](11_Channel_Architecture.md) |
| Partner scoring | `RoutingDecisionSnapshot` dimensions | GAP-012 |
| Multi-lab split | Single winner assignment model | Future ADR |
| Settlement | Payout fields on pricing/order lines | GAP-011 |

---

## Architecture Decision Records (Target)

Documented in handbook index; implement as ADRs when built:

| ADR | Topic |
|---|---|
| ADR-001 | Single laboratory fulfilment |
| ADR-002 | Two-attempt rerouting strategy |
| ADR-003 | Patient price guarantee |
| ADR-004 | Future multi-laboratory architecture |

Existing engine ADRs: [diagnostics_engine/docs/DECISIONS.md](../../../diagnostics_engine/docs/DECISIONS.md) (package SKU pricing, STRICT fulfillment).

---

## Success Criteria (Phase 1 Production)

From [doctor_pro_2.0.md](doctor_pro_2.0.md) §8:

- Every order fulfilled by one laboratory or rejected before booking
- Every routing attempt permanently auditable
- Automatic rerouting works for up to two laboratories
- Patients never charged for unfulfillable orders
- Internal routing complexity invisible to patients
- All routing decisions explainable
- Architecture supports future multi-lab without redesign

Track progress via [M1_Current_Feature_Matrix.md](M1_Current_Feature_Matrix.md) updated each milestone.

---

## Reading Order After M1

1. [M1_Marketplace_Gap_Analysis.md](M1_Marketplace_Gap_Analysis.md) — what to build
2. [Deilvery_roadmap.md](Deilvery_roadmap.md) — how to deliver
3. [11_Channel_Architecture.md](11_Channel_Architecture.md) — how to integrate channels
4. Begin M2 implementation

---

## Reference

**[M1_Marketplace_Gap_Analysis.md](M1_Marketplace_Gap_Analysis.md)** · [00_README.md](00_README.md)

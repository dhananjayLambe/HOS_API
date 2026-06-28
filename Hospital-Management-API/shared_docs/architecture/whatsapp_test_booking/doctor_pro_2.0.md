DoctorProCare Diagnostics Marketplace

Phase 1 — Production Requirement Specification

Document Type: Master Product & Architecture Requirement

Version: 1.0

Status: Approved

Scope: Diagnostics Marketplace – Phase 1

⸻

1. Purpose

This document defines the production requirements for the DoctorProCare Diagnostics Marketplace.

It is the primary business specification that governs Product, Engineering, QA, Operations, and future Marketplace development.

If implementation differs from this specification, this document takes precedence.

⸻

2. Phase 1 Objective

The objective of Phase 1 is simple.

DoctorProCare recommends the best laboratory that can perform the patient’s complete diagnostic order.

Only after fulfilment feasibility has been confirmed may the booking process begin.

Phase 1 focuses on reliability rather than marketplace complexity.

⸻

3. Phase 1 Scope

Phase 1 includes:

* Laboratory recommendation
* Package expansion
* Price quotation
* Home collection support
* Laboratory visit support
* Single laboratory fulfilment
* Automatic rerouting (maximum two attempts)
* Complete routing audit
* WhatsApp booking entry
* Booking creation
* Laboratory assignment
* Report delivery

Phase 1 excludes:

* Multi-laboratory fulfilment
* Partial fulfilment
* Split bookings
* Dynamic pricing
* Commercial settlement engine
* AI routing
* Laboratory capacity prediction

⸻

4. Business Principles

The marketplace is governed by the following principles.

Principle 1

Never accept an order that cannot be fulfilled.

⸻

Principle 2

Patient trust is more important than booking volume.

⸻

Principle 3

Booking begins only after fulfilment feasibility is confirmed.

⸻

Principle 4

Every routing decision must be explainable.

⸻

Principle 5

No routing history may ever be lost.

⸻

Principle 6

Internal operational complexity must remain invisible to patients.

⸻

Principle 7

The architecture must support future marketplace expansion without redesign.

⸻

5. End-to-End Marketplace Flow

Doctor Consultation
        │
        ▼
Investigation Items
        │
        ▼
Expand Packages
        │
        ▼
Eligibility Engine
        │
        ▼
Ranking Engine
        │
        ▼
Recommendation Available?
        │
 ┌──────┴─────────┐
 │                │
YES              NO
 │                │
 ▼                ▼
Show Offer     Inform Patient
 │                │
 ▼                ▼
Booking       Stop Workflow
 │
 ▼
Create Diagnostic Order
 │
 ▼
Assign Laboratory
 │
 ▼
Laboratory Accepts?
 │
 ┌──────┴──────────┐
 │                 │
YES               NO
 │                 │
 ▼                 ▼
Continue      Automatic Re-route
                     │
             Maximum Two Attempts
                     │
         ┌───────────┴───────────┐
         │                       │
     Success                Failed
         │                       │
         ▼                       ▼
 Continue Workflow      ROUTING_FAILED
                        Notify Patient

⸻

6. Production Requirements

Requirement 1 — Recommendation Before Booking

The platform must verify that at least one laboratory can fulfil the complete diagnostic order before booking begins.

If no laboratory is eligible:

* No booking
* No payment
* No appointment
* No laboratory assignment

The workflow stops immediately.

⸻

Requirement 2 — Complete Order Fulfilment

Phase 1 supports only complete order fulfilment.

The selected laboratory must perform every investigation contained within the order.

Partial fulfilment is not permitted.

⸻

Requirement 3 — Single Laboratory Assignment

Each diagnostic order is assigned to exactly one laboratory.

The assignment may change internally through rerouting, but only one laboratory is responsible for fulfilment at any given time.

⸻

Requirement 4 — Automatic Re-routing

If the assigned laboratory rejects the order or does not respond within the configured SLA:

* Exclude the laboratory
* Re-run recommendation
* Assign the next highest-ranked laboratory

Maximum attempts:

Two laboratories

If both fail:

* Mark order as ROUTING_FAILED
* Notify patient
* Stop workflow

⸻

Requirement 5 — Patient Pricing

The recommendation price is a live quotation.

Once the patient confirms the booking:

* Patient price becomes immutable.

Laboratory reassignment must never change the patient’s agreed price.

Commercial differences are handled internally.

⸻

Requirement 6 — Patient Communication

Patients should only receive meaningful notifications.

The patient should never see:

* Internal routing
* Laboratory rejection
* Rerouting
* Operational retries

Patients receive notifications only for:

* Recommendation available
* Booking confirmed
* Routing failure
* Collection details
* Report availability

⸻

Requirement 7 — Routing Audit

Every routing decision must be permanently recorded.

Each routing attempt must include:

* Routing Run
* Attempt Number
* Laboratory
* Branch
* Score
* Distance
* TAT
* Price
* Recommendation Labels
* Decision
* Timestamp
* Rejection Reason
* Timeout Status
* System/User Action

Routing history must be immutable.

⸻

Requirement 8 — Operational Audit

The platform must preserve complete operational history.

The system must always be able to answer:

* Why was this laboratory selected?
* Why was it rejected?
* Which laboratory fulfilled the order?
* How many routing attempts occurred?
* Why did routing fail?

⸻

Requirement 9 — Logging

Database audit records are the source of truth.

Application logs exist only for monitoring and debugging.

Every major marketplace event must generate an immutable audit event.

⸻

Requirement 10 — Future Compatibility

Phase 1 data models must support future capabilities without requiring redesign.

Future capabilities include:

* Multi-laboratory fulfilment
* Commercial settlement
* Dynamic pricing
* AI recommendations
* Partner performance scoring
* SLA optimisation
* Marketplace analytics

⸻

7. Operational Guardrails

The platform must NEVER:

* Accept an unfulfillable order
* Lose routing history
* Lose rejection reasons
* Overwrite routing attempts
* Route back to a rejected laboratory
* Charge a patient for an unfulfilled order
* Create duplicate routing attempts

The platform must ALWAYS:

* Verify fulfilment before booking
* Preserve complete audit history
* Preserve commercial history
* Maintain deterministic routing
* Produce reproducible routing decisions
* Support future marketplace evolution

⸻

8. Success Criteria

Phase 1 is considered production-ready when:

* Every order is fulfilled by a single laboratory or rejected before booking.
* Every routing attempt is permanently auditable.
* Automatic rerouting works for up to two laboratories.
* Patients are never charged for unfulfillable orders.
* Internal routing complexity remains invisible to patients.
* All routing decisions are explainable.
* The architecture supports future multi-laboratory fulfilment without redesign.

⸻

9. Future Roadmap

The marketplace will evolve in controlled phases.

Phase	Capability
Phase 1	Single laboratory recommendation and booking
Phase 2	WhatsApp conversational booking
Phase 3	Commercial audit and pricing lock
Phase 4	Multi-laboratory fulfilment
Phase 5	Settlement and reconciliation platform
Future	AI routing, dynamic pricing, partner scoring, predictive operations

⸻

Conclusion

This document is the governing production specification for the DoctorProCare Diagnostics Marketplace.

All future technical designs, implementation plans, APIs, routing engines, pricing engines, operational workflows, and marketplace features must comply with the requirements defined in this specification.
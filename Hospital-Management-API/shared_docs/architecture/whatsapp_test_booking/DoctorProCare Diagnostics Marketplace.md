DoctorProCare Diagnostics Marketplace

Phase 1 – Production Rules & Operational Specification

Document Type: Production Architecture Standard
 
Version: 1.0

Status: Approved Design Specification

Scope: Phase 1 Diagnostics Marketplace

⸻

1. Purpose

This document defines the production rules governing the DoctorProCare Diagnostics Marketplace.

It is the single source of truth for:

* Product
* Engineering
* QA
* Operations
* Future Marketplace Development

All implementations must follow these rules.

If implementation differs from this document, this document takes precedence.

⸻

2. Phase 1 Objective

The objective of Phase 1 is intentionally narrow.

DoctorProCare recommends one laboratory that can fulfil the patient’s entire diagnostic order.

If fulfilment cannot be guaranteed, booking must never begin.

Phase 1 does NOT support:

* Multi-lab fulfilment
* Partial fulfilment
* Dynamic repricing
* Commercial settlement engine
* Split bookings

⸻

3. Core Business Principles

The marketplace is built on five principles.

Principle 1

Never accept an order that cannot be fulfilled.

⸻

Principle 2

Patient trust is more important than maximizing booking volume.

⸻

Principle 3

Routing decisions must always be explainable.

⸻

Principle 4

No routing decision may ever be lost.

⸻

Principle 5

Future marketplace features must not require redesign of Phase 1 data models.

⸻

4. Marketplace Workflow

Consultation
        │
        ▼
Load Investigation Items
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
At least one eligible laboratory?
        │
 ┌──────┴────────┐
 │               │
YES             NO
 │               │
 ▼               ▼
Show Offer     Stop Flow
 │               │
 ▼               ▼
Patient Books  Notify Patient
 │
 ▼
Create Order
 │
 ▼
Assign Laboratory

Booking is never allowed unless at least one laboratory can fulfil the complete order.

⸻

5. Rule 1 – Recommendation Before Booking (Mandatory)

Before booking starts, the system must verify that the complete diagnostic order can be fulfilled.

Workflow:

Consultation

↓

Expand Tests & Packages

↓

Eligibility Engine

↓

Ranking Engine

↓

At least one eligible laboratory?

YES

→ Continue Booking

NO

→ Stop Booking

→ Inform Patient

→ Do not create booking

Business Principle:

Booking is permitted only after fulfilment feasibility is confirmed.

This prevents:

* Unfulfillable bookings
* Immediate cancellations
* Operational overhead
* Poor patient experience

⸻

6. Rule 2 – Single Laboratory Fulfilment

Phase 1 supports one fulfilment laboratory only.

The selected laboratory must fulfil:

* Every individual test
* Every package component
* Entire order

If any investigation cannot be fulfilled by the selected laboratory:

The laboratory is NOT eligible.

Order splitting is explicitly out of scope.

⸻

7. Rule 3 – Automatic Re-routing

Maximum routing attempts:

2

Attempt 1

Highest ranked laboratory

↓

Accept

↓

Continue

OR

Reject / Timeout

↓

Exclude laboratory permanently

↓

Run routing again

↓

Second ranked laboratory

↓

Accept

↓

Continue

OR

Reject / Timeout

↓

Routing Failed

↓

Notify Patient

No additional attempts.

⸻

8. Rule 4 – Booking Stops if Routing Fails

If both routing attempts fail:

* Booking ends
* No payment collected
* No appointment created
* No collection request
* No visit appointment
* No laboratory execution
* Order status = ROUTING_FAILED
* Patient notified politely

DoctorProCare never charges for an order that cannot be fulfilled.

⸻

9. Rule 5 – Routing Audit

Every routing attempt must be permanently stored.

Each attempt records:

* Routing Run ID
* Routing Attempt Number
* Order ID
* Consultation ID
* Patient ID
* Laboratory
* Branch
* Ranking Score
* Recommendation Labels
* Estimated Distance
* Estimated TAT
* Quoted Price
* Collection Mode
* Routing Decision
* Decision Timestamp
* Rejection Reason
* Timeout Flag
* Decision Source (System/User)
* Routing Version

Routing history must never be overwritten.

⸻

10. Rule 6 – Routing History

Every routing attempt creates a new audit record.

Example

Attempt 1

Lab A

Rejected

↓

Attempt 2

Lab B

Accepted

Final Order

↓

Lab B

History

↓

Attempt 1

↓

Attempt 2

Both attempts remain queryable forever.

⸻

11. Rule 7 – Excluded Laboratories

Once a laboratory rejects an order:

That laboratory becomes permanently excluded for that order.

It must never appear again during routing.

Example

Attempt 1

Lab A

↓

Rejected

↓

Attempt 2

Eligible Labs

Lab B

Lab C

Lab D

Lab A is excluded.

⸻

12. Rule 8 – Timeout Handling

A timeout is treated exactly like a rejection.

Timeout

↓

Auto Reject

↓

Exclude Branch

↓

Re-route

↓

Second Laboratory

If second laboratory also times out:

Order becomes ROUTING_FAILED.

⸻

13. Rule 9 – Patient Pricing

Before booking:

Price shown is live.

After booking confirmation:

Patient price is frozen.

If second laboratory costs more:

Patient still pays the original quoted price.

Commercial difference is handled internally.

Patient is never recharged because of laboratory reassignment.

⸻

14. Rule 10 – Patient Notifications

Internal routing is invisible to the patient.

Patient notifications:

Recommendation Available

No

Booking Confirmed

Yes

First Lab Accepted

Optional

First Lab Rejected

No

Second Lab Assigned

No

Second Lab Accepted

Optional

Routing Failed

Yes

Report Ready

Yes

Patients should never receive unnecessary operational updates.

⸻

15. Rule 11 – Operational Statuses

Marketplace statuses

RECOMMENDATION_PENDING

↓

RECOMMENDATION_AVAILABLE

↓

BOOKING_PENDING

↓

BOOKED

↓

ROUTING_PENDING

↓

LAB_ASSIGNED

↓

LAB_ACCEPTED

↓

COLLECTION

↓

PROCESSING

↓

REPORT_READY

↓

COMPLETED

Failure path

LAB_ASSIGNED

↓

LAB_REJECTED

↓

REROUTING

↓

LAB_ASSIGNED

OR

LAB_ASSIGNED

↓

LAB_REJECTED

↓

REROUTING

↓

LAB_REJECTED

↓

ROUTING_FAILED

⸻

16. Rule 12 – Logging

Every important event generates an immutable audit event.

Required events:

ORDER_RECOMMENDATION_STARTED

ORDER_RECOMMENDATION_COMPLETED

BOOKING_CREATED

ROUTING_STARTED

LAB_ASSIGNED

LAB_ACCEPTED

LAB_REJECTED

LAB_TIMEOUT

REROUTING_STARTED

REROUTING_COMPLETED

ROUTING_FAILED

PATIENT_NOTIFIED

REPORT_DELIVERED

⸻

17. Rule 13 – Database Audit

Application logs are NOT the source of truth.

Source of truth:

Database

Application logs exist only for observability.

Audit data must remain queryable for:

* Support
* Analytics
* Compliance
* Commercial reconciliation
* Partner scorecards

⸻

18. Rule 14 – Future Compatibility

Phase 1 models must support future marketplace capabilities without schema redesign.

Future roadmap:

Phase 2

* WhatsApp Booking

Phase 3

* Commercial Audit

Phase 4

* Multi-Lab Fulfilment

Phase 5

* Settlement Platform

Future

* AI Routing
* Dynamic Pricing
* SLA Optimisation
* Laboratory Performance Scoring

⸻

19. Rule 15 – Production Guardrails

The platform must NEVER:

* Accept an unfulfillable order
* Lose routing history
* Overwrite routing attempts
* Lose rejection reasons
* Re-route to a previously rejected laboratory
* Charge a patient for an unfulfilled booking
* Create duplicate routing attempts

The platform must ALWAYS:

* Validate fulfilment before booking
* Preserve complete routing history
* Preserve commercial history
* Preserve operational audit history
* Explain every routing decision
* Maintain deterministic routing
* Produce reproducible audit records

⸻

20. Success Criteria

Phase 1 is considered production-ready when:

* Every order is either fulfilled by one laboratory or rejected before booking.
* Every routing attempt is permanently auditable.
* Automatic re-routing succeeds without manual intervention whenever possible.
* Patients are never charged for orders that cannot be fulfilled.
* Routing failures are transparent and recoverable.
* The architecture can evolve to multi-lab fulfilment without redesigning the routing foundation.

This document is the governing specification for the DoctorProCare Diagnostics Marketplace Phase 1 implementation.




---
owner: platform-team
module: whatsapp_test_booking
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
document_type: delivery_roadmap
---

# DoctorProCare Diagnostics Marketplace — Phase 1 Delivery Roadmap

**Canonical filename:** `Delivery_Roadmap.md`  
(Legacy alias: [Deilvery_roadmap.md](Deilvery_roadmap.md))

**M1 approval:** [M1_Approval_Checklist.md](M1_Approval_Checklist.md)

---

DoctorProCare Diagnostics Marketplace

Phase 1 Delivery Roadmap

Document Type: Delivery Roadmap

Version: 1.0

Status: Approved

Goal

Deliver a production-ready Diagnostics Marketplace through small, independently testable milestones.

Each milestone must produce a deployable feature.

⸻

Overall Phase 1 Roadmap

Milestone	Feature	Status
0	Existing Foundation	✅ Completed
1	Marketplace Architecture Analysis	📝 Docs Complete — Pending Approval
2	Laboratory Recommendation Engine	Planned
3	Recommendation API	Planned
4	WhatsApp Recommendation Flow	Planned
5	Booking Flow	Planned
6	Laboratory Assignment & Re-routing	Planned
7	Report Delivery	Planned
8	Production Hardening	Planned

⸻

Milestone 0 – Existing Foundation

Objective

Verify all existing functionality before building new marketplace features.

Deliverables

* EMR Consultation
* Investigation Management
* Prescription Generation
* Prescription PDF
* WhatsApp Prescription Delivery
* Routing Engine
* Pricing Engine
* Diagnostic Order Creation
* Laboratory Assignment
* Report Upload APIs

Testing

* Complete consultation
* Generate prescription
* Receive WhatsApp message
* Verify PDF
* Verify routing works
* Verify reports upload

Exit Criteria

Prescription delivery works successfully on the WhatsApp test account.

⸻

Milestone 1 – Marketplace Architecture Analysis

Objective

Understand the current implementation before adding new business logic.

Deliverables

Handbook (current-state analysis — no future implementation detail in module docs):

* [08_Data_Model_and_Audit.md](08_Data_Model_and_Audit.md) — architecture / entity map
* [02_End_to_End_Workflow.md](02_End_to_End_Workflow.md) — workflow documentation
* [07_Commercial_and_Pricing.md](07_Commercial_and_Pricing.md) — pricing analysis
* [05_Routing_and_Rerouting.md](05_Routing_and_Rerouting.md) — routing analysis
* [06_Operations_Runbook.md](06_Operations_Runbook.md) — laboratory workflow analysis
* [10_WhatsApp_Integration.md](10_WhatsApp_Integration.md) — WhatsApp integration analysis

Supporting analysis:

* [01_Business_Principles.md](01_Business_Principles.md)
* [04_Booking_Lifecycle.md](04_Booking_Lifecycle.md)
* [03_Recommendation_Engine.md](03_Recommendation_Engine.md)
* [11_Channel_Architecture.md](11_Channel_Architecture.md) — golden channel architecture

Synthesis (what to build next):

* [M1_Current_Feature_Matrix.md](M1_Current_Feature_Matrix.md) — feature status at a glance
* [M1_Marketplace_Gap_Analysis.md](M1_Marketplace_Gap_Analysis.md) — all gaps → milestones
* [09_Future_Roadmap.md](09_Future_Roadmap.md) — long-term vision pointer
* [M1_Approval_Checklist.md](M1_Approval_Checklist.md) — sign-off tracker
* [00_README.md](00_README.md) — index and reading order

Requirements reference (unchanged):

* [doctor_pro_2.0.md](doctor_pro_2.0.md)
* [DoctorProCare Diagnostics Marketplace.md](DoctorProCare%20Diagnostics%20Marketplace.md)

Testing

Architecture review.

No code changes.

Exit Criteria

All Milestone 1 documents approved.

Do not start Milestone 2 until exit criteria met.

⸻

Milestone 2 – Laboratory Recommendation Engine

Objective

Recommend the best laboratory before booking.

Deliverables

* LabRecommendationService
* Package expansion reuse
* Recommendation DTO
* Total quotation
* Home/Lab collection recommendation
* Explainable recommendation metadata

No booking.

No order creation.

Read-only implementation.

Testing

Scenario 1

Single laboratory available

Expected

Recommendation returned.

⸻

Scenario 2

No laboratory available

Expected

Failure reason returned.

⸻

Scenario 3

Package recommendation

Expected

Package expanded correctly.

⸻

Scenario 4

Home collection

Expected

Correct collection mode.

⸻

Exit Criteria

Recommendation engine produces the same result as RoutingEngine.

⸻

Milestone 3 – Recommendation API

Objective

Expose recommendation to external channels.

Deliverables

REST API

Input

* Consultation
* Location

Output

* Laboratory
* Branch
* Price
* Collection Mode
* Distance
* TAT
* Labels

Testing

Postman

Swagger

Unit Tests

API Tests

Exit Criteria

Recommendation available through API.

⸻

Milestone 4 – WhatsApp Recommendation Flow

Objective

Allow patients to start diagnostic booking through WhatsApp.

Deliverables

New WhatsApp templates

* Laboratory recommendation
* Book Test
* Home Collection
* Laboratory Visit

Interactive buttons

Conversation flow

Booking confirmation

Testing

Patient receives

* Recommendation
* Price
* Collection Mode
* Buttons

Patient selects booking.

Exit Criteria

Complete WhatsApp recommendation flow working.

⸻

Milestone 5 – Booking Flow

Objective

Create diagnostic booking only after patient confirmation.

Deliverables

Booking confirmation

Address capture

Collection mode

Appointment preferences

Diagnostic Order creation

Booking confirmation message

Testing

Patient books through WhatsApp.

DiagnosticOrder created.

Laboratory assigned.

Exit Criteria

Successful booking.

⸻

Milestone 6 – Laboratory Assignment & Automatic Re-routing

Objective

Automate laboratory assignment and failure recovery.

Deliverables

First laboratory assignment

Automatic rejection handling

Automatic timeout handling

Maximum

Two routing attempts

Routing audit

Failure notifications

Testing

Scenario 1

First laboratory accepts.

Expected

Workflow continues.

⸻

Scenario 2

First laboratory rejects.

Expected

Second laboratory assigned.

⸻

Scenario 3

First timeout.

Expected

Second laboratory assigned.

⸻

Scenario 4

Both laboratories reject.

Expected

ROUTING_FAILED

Patient notified

No payment

No appointment

Exit Criteria

Automatic rerouting works without manual intervention.

⸻

Milestone 7 – Report Delivery

Objective

Deliver completed diagnostic reports.

Deliverables

Laboratory uploads report

Patient notification

WhatsApp report delivery

Report download

Audit

Testing

Upload report

Patient receives notification

Patient opens report

Exit Criteria

End-to-end report delivery completed.

⸻

Milestone 8 – Production Hardening

Objective

Production readiness.

Deliverables

Performance testing

Security review

Audit validation

Logging validation

Retry testing

Monitoring

Operational runbook

Disaster recovery validation

Testing

Load testing

Failure testing

Routing failures

WhatsApp failures

Database recovery

API recovery

Exit Criteria

Production deployment approval.

⸻

Production Acceptance Checklist

Business

* Recommendation before booking
* Single laboratory fulfilment
* Automatic rerouting
* Complete audit
* Patient price protection

⸻

Engineering

* Unit tests
* Integration tests
* API tests
* Logging
* Monitoring

⸻

Operations

* Dashboard
* Audit queries
* Failure alerts
* Retry procedures

⸻

QA

Test every scenario:

✓ Laboratory available

✓ No laboratory available

✓ Home collection

✓ Laboratory visit

✓ Package booking

✓ Single test

✓ First rejection

✓ Second rejection

✓ Timeout

✓ Routing failure

✓ WhatsApp flow

✓ Report delivery

⸻

Phase 1 Success Criteria

Phase 1 is complete when:

* Patients receive laboratory recommendations before booking.
* Booking begins only after recommendation acceptance.
* Every order is fulfilled by one laboratory.
* Automatic rerouting works for two attempts.
* Complete routing history is preserved.
* Patients are never charged for unfulfillable orders.
* WhatsApp supports the complete booking journey.
* Reports are delivered successfully.
* The platform is production-ready.
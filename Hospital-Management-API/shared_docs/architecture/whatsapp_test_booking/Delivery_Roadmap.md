---
owner: platform-team
module: whatsapp_test_booking
version: 1.0
last_updated: 2026-06-28
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
0	Existing Foundation	✅ Complete
1	Marketplace Architecture Analysis	📝 Docs complete — pending approval
2	Laboratory Recommendation Engine	✅ Complete
3	Marketplace Recommendation Platform API	✅ Complete
4	WhatsApp Booking Flow	Planned
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

Status: **Complete**

Objective

Recommend the best laboratory before booking (read-only — no order creation, no routing writes).

Deliverables

* `LabRecommendationService` — `diagnostics_engine/domain/recommendation.py`
* Shared investigation resolution — `diagnostics_engine/domain/investigation_resolution.py`
* `RecommendationResult` DTO (dual pricing, expanded tests, ranking metadata)
* Reuses `EligibilityEngine.evaluate_requirements`, `RankingEngine.rank`, `PricingQuoteService`
* Structured logging (`recommendation.started|completed|failed`)

Docs

[milestone_2/](milestone_2/) — Engine Reuse Matrix, service design, acceptance checklist

Testing

| Scenario | Expected |
|----------|----------|
| Single laboratory available | Recommendation returned |
| No laboratory available | `failure_reason` returned |
| Package recommendation | Package expanded in DTO |
| Home collection | Correct `collection_mode` |
| Parity with routing pipeline | Same branch, price, score, labels as post-order routing |

```bash
DJANGO_SETTINGS_MODULE=main.settings_test .venv/bin/python manage.py test \
  diagnostics_engine.tests.test_lab_recommendation_service \
  diagnostics_engine.tests.test_order_creation_service
```

Exit Criteria

* [x] Recommendation engine produces the same result as routing eligibility + ranking (parity test)
* [x] No `DiagnosticOrder` or `RoutingRun` side effects on recommend
* [x] Unit and integration tests green (9 tests in `test_lab_recommendation_service.py`)

⸻

Milestone 3 – Marketplace Recommendation Platform API

Status: **Complete**

Depends on: Milestone 2 (`LabRecommendationService`)

Objective

Expose M2 as a versioned platform API for all future channels (WhatsApp, Mobile, Doctor Portal, Admin, Call Center, Partner APIs).

Endpoint

`POST /api/v1/marketplace/diagnostics/recommendations/`

Deliverables

* Nested response envelope (`metadata`, `recommendation`, `tests`, `packages`, `error`)
* `recommendation_id` + 15-minute TTL (`MARKETPLACE_RECOMMENDATION_TTL_SECONDS`, default 900)
* Lab/branch enrichment, `home_collection_available` / `lab_visit_available`
* Channel-ready fields: `branch_address`, `branch_contact_number`, `branch_working_hours`, `google_maps_url`, `available_slot_dates` (null until slot API)
* Explainability: `primary_label`, `secondary_labels`, `why_recommended`
* Failure UX: `error.next_action` (e.g. `CHANGE_LOCATION`, `TRY_AGAIN`)
* JWT auth, consultation access, rate limit (20/min)
* Audit model — `MarketplaceRecommendationApiAudit` (one row per call; no recommendation cache DB)
* Swagger (`drf-yasg`), Postman collection

Code

| Component | Path |
|-----------|------|
| View | `diagnostics_engine/api/views/marketplace_recommendation.py` |
| Serializers | `diagnostics_engine/api/serializers/marketplace_recommendation.py` |
| URLs | `diagnostics_engine/api/marketplace_urls.py` |
| Access | `diagnostics_engine/services/recommendation_access.py` |
| Audit | `diagnostics_engine/models/marketplace_recommendation_audit.py` |
| Tests | `diagnostics_engine/tests/test_marketplace_recommendation_api.py` |

Docs

[milestone_3/](milestone_3/) — [M3_API_Contract.md](milestone_3/M3_API_Contract.md), architecture, security, performance, acceptance checklists

Testing

```bash
DJANGO_SETTINGS_MODULE=main.settings_test .venv/bin/python manage.py migrate
DJANGO_SETTINGS_MODULE=main.settings_test .venv/bin/python manage.py test \
  diagnostics_engine.tests.test_marketplace_recommendation_api \
  diagnostics_engine.tests.test_lab_recommendation_service
```

Includes auth, authz, success/failure envelopes, chaos scenarios (inactive branch, missing location), parity smoke vs domain service.

Exit Criteria

* [x] Recommendation available through versioned REST API with zero duplicated business logic
* [x] No order/routing writes; audit insert only
* [x] **25 tests green** (16 M3 API + 9 M2 regression) — verified locally 2026-06-28
* [x] Migration `0017_marketplace_recommendation_api_audit` applied

⸻

Milestone 4 – WhatsApp Booking Flow

Status: **In progress** — M4.3/4.4 recommendation orchestration **complete** (2026-06-28); Flow + confirm handoff remain open.

Depends on: Milestone 3 (`POST /api/v1/marketplace/diagnostics/recommendations/`)

Objective

Deliver the **complete WhatsApp booking journey** from recommendation message through Flow data collection and booking confirmation handoff — not recommendation alone.

Governing specification

[11_WhatsApp_Booking_Flow.md](11_WhatsApp_Booking_Flow.md) — single source of truth for WhatsApp, mobile, web, and call center booking UX.

### M4.3 & M4.4 — Recommendation WhatsApp orchestration (complete)

* After prescription WhatsApp `SENT` → `LabRecommendationService.recommend()` (in-process)
* Template `diagnostic_test_recommendation_v3` when `available=true` (Book Tests button + flow_action_data)
* Plain-text Sorry when `available=false` (no investigations → skip entirely)
* Idempotency: `diagnostic_recommendation_{consultation_id}`
* Celery: `prepare_diagnostic_recommendation_whatsapp` / `send_diagnostic_recommendation_whatsapp`
* Tests: `notifications/tests/test_diagnostic_recommendation_whatsapp.py`

Deliverables (remaining in M4)
* WhatsApp Flow — home collection path (address, location, date, slot)
* WhatsApp Flow — lab visit path (date, slot only)
* Review screen fed entirely from M3 API
* Booking request handoff with `metadata.recommendation_id` (M5 persistence)

Out of scope in M4

* DiagnosticOrder creation, routing, payment, lab assignment (M5+)

Testing

* Prescription pipeline → recommendation message
* Book Tests opens Flow; collection mode auto-selected
* Home vs lab visit field requirements
* Failure path when no eligible lab
* Confirm handoff payload includes `recommendation_id`

Exit Criteria

All items in [11_WhatsApp_Booking_Flow.md §17](11_WhatsApp_Booking_Flow.md#17-success-criteria-m4-exit).

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
* API tests (M3 marketplace recommendation — 16 cases + M2 regression)
* Logging
* Monitoring
* Marketplace recommendation audit (`MarketplaceRecommendationApiAudit`)

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

✓ Marketplace recommendation API (M3)

✓ First rejection

✓ Second rejection

✓ Timeout

✓ Routing failure

✓ WhatsApp flow

✓ Report delivery

⸻

Phase 1 Success Criteria

Phase 1 is complete when:

* Patients receive laboratory recommendations before booking (M2 engine + M3 API).
* Booking begins only after recommendation acceptance.
* Every order is fulfilled by one laboratory.
* Automatic rerouting works for two attempts.
* Complete routing history is preserved.
* Patients are never charged for unfulfillable orders.
* WhatsApp supports the complete booking journey.
* Reports are delivered successfully.
* The platform is production-ready.
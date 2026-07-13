10_Implementation_Plan.md

DoctorProCare Observability Implementation Plan

Document Type: Implementation Roadmap

Version: 1.0

Status: Production Ready

Implementation Target: Phase 1 (Production MVP)

Related Documents

* 00_README.md
* 01_Observability_Architecture.md
* 02_Logging_Principles.md
* 03_Logger_Framework.md
* 04_Correlation_Framework.md
* 05_Clinical_Audit.md
* 06_Business_Audit.md
* 07_Support_Trace_Index.md
* 08_CloudWatch_Integration.md
* 09_Monitoring_and_Alerts.md
* 11_Exception_Framework.md
* 12_Output_Handler_Framework.md
* 13_Logging_Platform_Certification.md
* 14_Correlation_ID_Framework.md
* 15_Logger_Context_Integration.md

⸻

Purpose

This document defines the implementation roadmap for the DoctorProCare Observability Platform.

The objective is to build a practical, production-ready logging, auditing, monitoring, and tracing solution that supports a solo developer today while providing a clear migration path to an enterprise-scale platform.

The implementation is intentionally phased to minimize development time while maximizing operational visibility.

⸻

Phase 1 Goals

Phase 1 focuses on operational stability.

The platform should enable developers to:

* Identify production failures quickly.
* Trace patient workflows end-to-end.
* Investigate business events.
* Review clinical history.
* Receive operational alerts.
* Diagnose issues without accessing production servers.

⸻

Phase 1 Deliverables

Phase 1 includes:

* Shared Logger Framework
* Correlation Framework
* Structured JSON Logging
* PostgreSQL Clinical Audit
* PostgreSQL Business Audit
* Support Trace Index
* CloudWatch Integration
* CloudWatch Dashboards
* CloudWatch Alerts
* Production Log Search

⸻

High-Level Implementation Architecture

                  DoctorProCare Platform
      Django API          Celery Workers
            │                  │
            └──────────┬───────┘
                       │
            Correlation Framework
         (ID → Context → Middleware)
                       │
               Shared Logger Framework
                       │
         ┌─────────────┼─────────────┐
         │             │             │
         ▼             ▼             ▼
 Application Logs  Clinical Audit  Business Audit
         │             │             │
         ▼             ▼             ▼
   CloudWatch      PostgreSQL    PostgreSQL
         │                           │
         └─────────────┬─────────────┘
                       ▼
              Support Trace Index
                       │
                       ▼
               Monitoring & Alerts

⸻

Implementation Phases

Phase 1 — Foundation

Objective

Build the core logging infrastructure.

Tasks

* Create shared/logging/
* Implement Logger Framework
* Implement JSON formatter
* Configure console logging
* Configure CloudWatch handler
* Add environment configuration
* Create logging constants
* Implement exception logging

Deliverable

Every application can generate structured logs.

⸻

Phase 2 — Correlation Framework

Objective

Trace every workflow end-to-end with automatic Correlation ID propagation.

Milestones

| Milestone | Scope | Status |
|-----------|-------|--------|
| **2.1** Correlation ID Foundation | `correlation.py` — generate, validate, parse, serialize | Complete |
| **2.2** Request Context Framework | `context.py` — ContextVar lifecycle, `LogContext` wiring | Complete |
| **2.3** Django Correlation Middleware | `middleware.py` — thin lifecycle orchestrator (delegates to M2.1/M2.2) | Complete |
| **2.4** Logger Integration | `context_enricher.py` — auto-inject context via ContextEnricher | Complete |
| **2.5** Celery Propagation | `celery_context.py` + `context_serializer.py` — signal-based restore/propagate | Complete |
| **2.6** End-to-End Certification | Integration tests, golden traces, CloudWatch validation | Complete |

Deliverable

Complete end-to-end request tracing with zero manual Correlation ID handling in application code.

See [14_Correlation_ID_Framework.md](14_Correlation_ID_Framework.md), [15_Logger_Context_Integration.md](15_Logger_Context_Integration.md), [16_Celery_Context_Propagation.md](16_Celery_Context_Propagation.md), and [17_End_to_End_Correlation_Validation.md](17_End_to_End_Correlation_Validation.md).

⸻

Phase 3 — Clinical Audit

Objective

Capture all patient-care events as a permanent, immutable EMR audit trail.

Milestones

| Milestone | Scope | Status |
|-----------|-------|--------|
| **3.1** Clinical Audit Foundation | `clinical_audit` app — model, enums, migration, immutability | Complete |
| **3.2** Clinical Audit Service | Builder + service write path (fail-open) | Complete |
| **3.3** Consultation Audit Framework | `consultations_core/audit/` — lifecycle + section events, idempotency, on_commit | Complete |
| **3.4** Clinical Documentation Audit | `clinical_documentation/audit/` — diagnosis, allergy, vitals, symptoms, fail-open, on_commit | Complete |
| **3.5** Prescription & Recommendation Audit | `consultations_core/audit/prescription/` — created, signed, downloaded, recommendation generated, fail-open, on_commit | Complete |
| **3.6** Diagnostic & Report Audit | `diagnostics_engine/audit/` — test ordered, recommendation sent, report uploaded/viewed/downloaded/shared, fail-open, on_commit | Complete |
| **3.7** Certification | Golden clinical timeline validation, validators, E2E certification suite | Complete |
| **3.8** Query / timeline APIs | Support read path | Planned |
| **3.9** Logger integration | Dual-write to application logs / CloudWatch | Planned |

Deliverable

Permanent EMR audit history.

See [`clinical_audit/docs/README.md`](../../../clinical_audit/docs/README.md), [`clinical_audit/docs/HOW_TO_USE.md`](../../../clinical_audit/docs/HOW_TO_USE.md), [`clinical_audit/docs/AUDIT_EVENTS.md`](../../../clinical_audit/docs/AUDIT_EVENTS.md), [`clinical_audit/docs/CONSULTATION_AUDIT.md`](../../../clinical_audit/docs/CONSULTATION_AUDIT.md), [`clinical_audit/docs/CLINICAL_DOCUMENTATION_AUDIT.md`](../../../clinical_audit/docs/CLINICAL_DOCUMENTATION_AUDIT.md), [`clinical_audit/docs/PRESCRIPTION_AUDIT.md`](../../../clinical_audit/docs/PRESCRIPTION_AUDIT.md), [`clinical_audit/docs/DIAGNOSTIC_AUDIT.md`](../../../clinical_audit/docs/DIAGNOSTIC_AUDIT.md), [`clinical_audit/docs/CERTIFICATION.md`](../../../clinical_audit/docs/CERTIFICATION.md), [`clinical_audit/docs/CERTIFICATION_CHECKLIST.md`](../../../clinical_audit/docs/CERTIFICATION_CHECKLIST.md), [`clinical_audit/docs/SERVICE.md`](../../../clinical_audit/docs/SERVICE.md), and [05_Clinical_Audit.md](05_Clinical_Audit.md).

⸻

Phase 4 — Business Audit

Objective

Capture operational workflow events with workflow-centric execution tracing.

| Milestone | Scope | Status |
|---|---|---|
| M4.1 | Foundation — `shared/audit/` platform, `business_audit` app, immutable model, fail-open service, tests, docs | **Complete** |
| M4.2 | Recommendation & marketplace audit — `RecommendationAuditService`, full lifecycle wiring, expiration job | **Complete** |
| M4.3 | Diagnostic booking audit — `BookingAuditService`, FSM lifecycle, expiration job | **Complete** |
| M4.4 | Decision Engine Audit Framework — laboratory routing, decision snapshots, certification | **Complete** |
| M4.5 | Communication Audit Framework — report delivery, channel/provider snapshots, certification | **Complete** |
| M4.6 | Notification / WhatsApp wiring | Planned |
| M4.7 | Payment workflow wiring | Planned |
| M4.8 | Marketplace / home collection wiring | Planned |
| M4.9 | Business Audit certification | Planned |

M4.1 deliverables

* `shared/audit/` — envelope, sanitization, immutability, base validator/builder/repository/service
* `business_audit` Django app — workflow-centric model with `workflow_instance_id`, `parent_workflow_instance_id`, `sequence_no`, separated `status`/`outcome`, execution/provider/retry fields
* Extended `LogContext` — workflow, tenant, environment, deployment fields
* `BusinessAuditService.record()` — fail-open write path
* 29 unit/integration tests; clinical regression (196 tests) unchanged
* Documentation — [`business_audit/docs/README.md`](../../../business_audit/docs/README.md) and companion docs

M4.2 deliverables

* `business_audit/recommendation/` — facade, payload/snapshot builders, repository, hooks
* Domain actions: `recommendation.generated`, `.sent`, `.delivered`, `.read`, `.failed`, `.retried`, `.expired`
* Integrations: marketplace API, WhatsApp orchestrator, send/webhook/retry paths
* Celery beat: `expire_stale_recommendations` (5-minute schedule)
* 12 recommendation unit/integration tests; full suite 241 passed
* Documentation — [`RECOMMENDATION_AUDIT.md`](../../../business_audit/docs/RECOMMENDATION_AUDIT.md), [`RECOMMENDATION_EVENTS.md`](../../../business_audit/docs/RECOMMENDATION_EVENTS.md), [`RECOMMENDATION_WORKFLOW.md`](../../../business_audit/docs/RECOMMENDATION_WORKFLOW.md)

M4.3 deliverables

* `business_audit/booking/` — facade, payload/snapshot builders, repository, hooks (reference workflow audit pattern)
* Domain actions: `booking.created`, `.confirmed`, `.modified`, `.cancelled`, `.expired`, `.closed`
* FSM: every record captures `state_before` → `state_after`
* Integrations: order creation, visit workflow, lab routing, cancellation, order completion
* Celery beat: `expire_stale_bookings` (5-minute schedule)
* `DiagnosticOrder.operational_metadata` for recommendation linkage
* 35 booking unit/integration tests; full suite 276 passed
* Documentation — [`BOOKING_AUDIT.md`](../../../business_audit/docs/BOOKING_AUDIT.md), [`BOOKING_EVENTS.md`](../../../business_audit/docs/BOOKING_EVENTS.md), [`BOOKING_WORKFLOW.md`](../../../business_audit/docs/BOOKING_WORKFLOW.md), [`BOOKING_STATE_MACHINE.md`](../../../business_audit/docs/BOOKING_STATE_MACHINE.md)

M4.4 deliverables

* `business_audit/decision/` — generic Decision Snapshot types, builder, constants
* `business_audit/decision/routing/` — `RoutingAuditService`, payload builder, repository, hooks
* `business_audit/decision/certification/` — routing decision certification validators
* Domain actions: `routing.started`, `.rule_evaluated`, `.lab_matched`, `.price_compared`, `.discount_applied`, `.lab_assigned`, `.failed`, `.manual_override`
* `DecisionStrategy` enum; `BusinessResourceType.DECISION`
* Integrations: post-booking `RoutingService`/`AssignmentService`, marketplace `LabRecommendationService`, manual override hook
* `RoutingRun.metadata` stores `decision_id` + `attempt_number`
* 40 decision unit/integration/certification tests; full suite 316 passed
* Documentation — [`DECISION_AUDIT.md`](../../../business_audit/docs/DECISION_AUDIT.md), [`ROUTING_AUDIT.md`](../../../business_audit/docs/ROUTING_AUDIT.md), companion ROUTING_* and DECISION_* docs

M4.5 deliverables

* `business_audit/communication/` — generic Communication enums, types, context, snapshot builder, provider registry
* `business_audit/communication/report/` — `ReportCommunicationAuditService`, payload builder, repository, hooks
* `business_audit/communication/certification/` — timeline, snapshot, correlation validators
* Domain actions: `report.ready`, `.delivery_requested`, `.whatsapp_delivery`, `.email_delivery`, `.sms_delivery`, `.portal_delivery`, `.delivery_failed`, `.delivery_retried`, `communication.webhook_received` (stub)
* `CommunicationChannel`, `CommunicationProvider`, `CommunicationStrategy`, `CommunicationStatus` enums; `BusinessResourceType.COMMUNICATION`
* Integrations: `ReportWorkflowService.mark_ready`, `ReportDeliveryService` (prepare/send/fail/retry), portal + webhook extension stubs
* `LabReportDeliveryLog.metadata` stores `communication_id`, `communication_attempt_id`, `attempt_number`
* 38 communication unit/integration/certification tests; full suite 354 passed
* Documentation — [`COMMUNICATION_AUDIT.md`](../../../business_audit/docs/COMMUNICATION_AUDIT.md), [`REPORT_DELIVERY_AUDIT.md`](../../../business_audit/docs/REPORT_DELIVERY_AUDIT.md), companion COMMUNICATION_* and REPORT_DELIVERY_* docs
* Stub packages: `communication/prescription/`, `reminder/`, `otp/`, `invoice/` (M4.6+)

Tasks (M4.6+)

* Wire module facades for recommendations, bookings, routing, delivery, notifications, payments
* Business Audit certification (M4.9)

Deliverable

Permanent operational history with nested workflow reconstruction and correlation-linked patient journeys.

See [`business_audit/docs/README.md`](../../../business_audit/docs/README.md) and [06_Business_Audit.md](06_Business_Audit.md).

⸻

Phase 5 — Support Trace Index

Objective

Enable rapid production investigation.

Tasks

* Create Support Trace model
* Maintain workflow state
* Index business identifiers
* Store Correlation ID
* Build search APIs
* Build trace lookup service

Deliverable

Single entry point for production support.

⸻

Phase 6 — CloudWatch Integration

Objective

Centralize operational logging.

Tasks

* Create log groups
* Configure retention
* Configure JSON logging
* Configure log streams
* Deploy CloudWatch handler

Deliverable

Centralized production logs.

⸻

Phase 7 — Monitoring

Objective

Observe platform health.

Tasks

* Create CloudWatch Metrics
* Configure Metric Filters
* Configure Dashboards
* Configure Alarms
* Configure SNS Notifications

Deliverable

Production monitoring.

⸻

Implementation Priority

The recommended order is:

1. Logger Framework
2. Correlation Framework
3. CloudWatch Integration
4. Clinical Audit
5. Business Audit
6. Support Trace Index
7. Monitoring
8. Dashboards
9. Alerts
10. Performance Optimization

Each phase builds upon the previous one.

⸻

Module Implementation Matrix

Module	Logging	Clinical Audit	Business Audit	Trace Index
Authentication	Yes	Yes	No	Yes
Patient	Yes	Yes	No	Yes
Consultation	Yes	Yes	Yes	Yes
Prescription	Yes	Yes	Yes	Yes
Recommendation	Yes	Yes	Yes	Yes
Diagnostic Booking	Yes	No	Yes	Yes
Laboratory	Yes	No	Yes	Yes
Reports	Yes	Yes	Yes	Yes
WhatsApp	Yes	No	Yes	Yes
Payments	Yes	No	Yes	Yes

⸻

CloudWatch Deliverables

Production setup includes:

Log Groups

* /doctorprocare/application
* /doctorprocare/api
* /doctorprocare/celery
* /doctorprocare/recommendation
* /doctorprocare/booking
* /doctorprocare/reports
* /doctorprocare/whatsapp

Dashboards

* Platform Dashboard
* Infrastructure Dashboard
* Recommendation Dashboard
* Booking Dashboard
* Report Dashboard

Alarms

* API Errors
* Celery Failures
* Database Errors
* Report Upload Failures
* WhatsApp Failures
* Infrastructure Failures

⸻

Testing Strategy

Every implementation phase must include testing.

Unit Testing

* Logger
* Formatter
* Context
* Audit Services

⸻

Integration Testing

* API Logging
* Celery Logging
* Audit Creation
* CloudWatch Handler
* Trace Propagation

⸻

Production Validation

Validate:

* Log generation
* Correlation propagation
* Audit persistence
* Dashboard visibility
* Alarm notifications

⸻

Deployment Checklist

Before production deployment:

* Logger configured
* JSON logging enabled
* Correlation middleware enabled
* Audit tables migrated
* CloudWatch permissions configured
* Log groups created
* Retention policies configured
* Dashboards deployed
* Alarms deployed
* SNS notifications tested

No production deployment should occur until this checklist is complete.

⸻

Success Criteria

The implementation is considered successful when:

* Every request generates structured logs.
* Every workflow receives a Correlation ID.
* Clinical events are permanently audited.
* Business events are permanently audited.
* Support can locate workflows using business identifiers.
* CloudWatch contains searchable logs.
* Dashboards provide operational visibility.
* Alerts notify administrators of production issues.
* Failures can be traced end-to-end within minutes.

⸻

Future Roadmap

After Phase 1, future enhancements may include:

Phase 2

* OpenTelemetry
* Distributed Tracing
* Amazon Managed Grafana
* OpenSearch Integration
* Advanced Dashboards

⸻

Phase 3

* AI-assisted Incident Detection
* Automatic Root Cause Analysis
* SLA Monitoring
* Predictive Capacity Planning
* Business Intelligence Integration

These enhancements build on the Phase 1 architecture without requiring redesign.

⸻

Estimated Implementation Timeline

Phase	Duration
Logger Framework	2 Days
Correlation Framework	1 Day
CloudWatch Integration	1 Day
Clinical Audit	2 Days
Business Audit	2 Days
Support Trace Index	2 Days
Monitoring & Dashboards	2 Days
Testing & Production Validation	2 Days

Estimated Total: 14 working days

⸻

Production Readiness Checklist

The observability platform is production-ready when:

* Structured logging is implemented across all services.
* Correlation IDs are automatically propagated.
* Clinical Audit captures all patient-care events.
* Business Audit captures all operational events.
* Support Trace Index enables fast investigations.
* CloudWatch receives structured JSON logs.
* Dashboards provide live operational visibility.
* Critical alarms are configured and tested.
* Documentation is complete and aligned with implementation.
* The platform can scale without architectural changes.

⸻

Summary

The DoctorProCare Observability Implementation Plan provides a structured roadmap for delivering a production-grade observability platform.

By implementing the Logger Framework, Correlation Framework, Clinical Audit, Business Audit, Support Trace Index, CloudWatch integration, and Monitoring & Alerts in phased iterations, DoctorProCare gains comprehensive visibility into technical operations, patient workflows, and business processes.

This implementation strategy prioritizes operational simplicity for a solo developer today while establishing a robust architectural foundation capable of supporting future enterprise growth, regulatory compliance, and large-scale healthcare operations.
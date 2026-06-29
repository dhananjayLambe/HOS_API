01_Logging_Principles.md

DoctorProCare Logging Principles

Document Type: Development Standard

Version: 1.0

Status: Production Ready

Related Documents

* 00_README.md
* Observability Architecture (Logging Bible)
* Logger Framework
* Correlation Framework
* Clinical Audit
* Business Audit

⸻

Purpose

This document defines the engineering principles for logging throughout the DoctorProCare platform.

Every developer must follow these principles when implementing application logs, audit events, monitoring, and production diagnostics.

These principles ensure that logging remains:

* Consistent
* Secure
* Searchable
* Maintainable
* Scalable
* Production Ready

⸻

Objectives

DoctorProCare logging must achieve the following objectives.

Diagnose Production Issues

Every production issue should be diagnosable using application logs.

⸻

Support Clinical Auditing

Every clinical action affecting patient care must generate an audit record.

⸻

Support Business Operations

Important workflow milestones must be permanently recorded.

⸻

Enable Production Support

Support engineers should quickly locate patient journeys using business identifiers.

⸻

Prepare for Enterprise Growth

The logging architecture should support future observability platforms without changing application code.

⸻

Principle 1 — Log Business Events, Not Every Line of Code

Logging should describe meaningful business operations.

Good Examples

* Consultation Started
* Recommendation Generated
* Booking Submitted
* Report Uploaded

Avoid

* Entered Function
* Leaving Function
* Variable Values
* Internal Loops

Application logs should describe business workflows rather than implementation details.

⸻

Principle 2 — One Correlation ID Per Workflow

Every request must generate a Correlation ID.

All downstream operations must reuse the same Correlation ID.

Example

Consultation

↓

Prescription

↓

Recommendation

↓

WhatsApp

↓

Booking

↓

Laboratory

↓

Report Upload

↓

Report Delivery

Searching one Correlation ID must reconstruct the complete workflow.

⸻

Principle 3 — Structured Logging Only

Every application log must be structured.

Free-form text logs are prohibited.

Example

Correct

{
  "module":"recommendation",
  "action":"recommendation.completed",
  "consultation_id":"...",
  "duration_ms":84,
  "status":"SUCCESS"
}

Incorrect

Recommendation completed successfully.

Structured logs enable reliable searching, filtering, dashboards, and alerts.

⸻

Principle 4 — Separate Logging Responsibilities

DoctorProCare separates observability into four independent responsibilities.

Application Logs

Technical diagnostics.

Clinical Audit

Permanent healthcare audit.

Business Audit

Permanent workflow history.

Support Trace

Production search index.

Never mix these responsibilities.

⸻

Principle 5 — Log the Outcome

Every major workflow should log:

Started

Completed

Failed

Retried (if applicable)

Avoid logging only failures.

Successful operations are equally important for production investigations.

⸻

Principle 6 — Use Standard Log Levels

DEBUG

Development diagnostics only.

INFO

Normal business execution.

WARNING

Recoverable conditions.

ERROR

Workflow failed.

CRITICAL

Production outage or major platform failure.

Never use ERROR for expected business outcomes.

Example

No eligible laboratory

This is a business outcome.

Log as INFO or WARNING depending on context.

⸻

Principle 7 — Protect Patient Privacy

Application logs must never contain:

* Passwords
* JWT Tokens
* OTPs
* Access Tokens
* Medical Report Contents
* Prescription PDF Contents
* Clinical Notes
* Laboratory Results

Avoid logging raw patient mobile numbers whenever possible.

Prefer Patient Account ID or Correlation ID.

⸻

Principle 8 — Clinical Actions Require Audit Records

Every action affecting patient care must generate an immutable Clinical Audit record.

Examples

Patient Record Viewed

Prescription Generated

Prescription Updated

Consultation Completed

Report Uploaded

Report Downloaded

Clinical Audit records are permanent.

Application logs are temporary.

⸻

Principle 9 — Business Milestones Require Business Audit

Business workflows must generate Business Audit events.

Examples

Recommendation Generated

Recommendation Sent

Booking Submitted

Booking Accepted

Booking Rejected

Report Delivered

WhatsApp Delivered

These records support operational reporting.

⸻

Principle 10 — Every Error Must Be Actionable

An error log must contain sufficient information to investigate the problem.

Minimum fields

* Module
* Action
* Correlation ID
* Error Code
* Exception Type
* Error Message
* Stack Trace
* Execution Duration

Never log simply:

Something went wrong.

⸻

Principle 11 — Performance Matters

Logging must never significantly impact application performance.

Avoid

Logging inside tight loops.

Logging large objects.

Logging entire API payloads.

Logging binary files.

Prefer concise structured records.

⸻

Principle 12 — Standard Module Names

Every log must belong to one module.

Approved modules

* authentication
* authorization
* api
* consultation
* prescription
* recommendation
* booking
* routing
* laboratory
* reports
* whatsapp
* celery
* database
* storage
* scheduler
* monitoring
* infrastructure
* security

New modules should follow the same naming convention.

⸻

Principle 13 — Standard Action Names

Actions should use a consistent format.

Examples

consultation.started

consultation.completed

recommendation.started

recommendation.completed

booking.submitted

booking.accepted

booking.rejected

report.uploaded

report.downloaded

whatsapp.sent

whatsapp.failed

Avoid inconsistent naming such as

CreateBooking

BookingDone

SendMessage

⸻

Principle 14 — Log Once

A business event should be logged exactly once at the appropriate layer.

Avoid duplicate logging across multiple services.

Example

Recommendation Completed

Only the Recommendation Service logs completion.

The API layer logs request handling.

Do not duplicate the same business event.

⸻

Principle 15 — Logs Must Support Search

Every important log should be searchable using identifiers.

Preferred identifiers

* Correlation ID
* Consultation ID
* Encounter ID
* Booking ID
* Report ID
* Recommendation ID
* WhatsApp Message ID
* User ID

Support searches should begin with the Support Trace Index rather than CloudWatch.

⸻

Principle 16 — Logging Must Be Environment Independent

Application code should never know where logs are stored.

Development

Console

Production

CloudWatch

Future

OpenSearch

Datadog

Grafana

Only logging configuration changes.

Application code remains unchanged.

⸻

Principle 17 — Design for Growth

DoctorProCare is expected to evolve into a large healthcare platform.

The logging framework should support:

* Multiple applications
* Background workers
* REST APIs
* Mobile applications
* Third-party integrations
* Distributed services

without requiring architectural redesign.

⸻

Compliance Considerations

The logging framework has been designed to support future healthcare compliance requirements by providing:

* Permanent Clinical Audit
* Immutable Business Audit
* Structured Application Logs
* Correlation-based Traceability
* Secure Handling of Sensitive Data

Implementation of specific regulatory requirements may vary by deployment jurisdiction.

⸻

Summary

Every developer should remember the following principles.

* Log business workflows, not implementation details.
* Generate one Correlation ID per workflow.
* Keep Application Logs, Clinical Audit, Business Audit, and Support Trace separate.
* Use structured logging.
* Protect patient privacy.
* Record meaningful business milestones.
* Ensure every production issue can be investigated.
* Build today with enterprise scalability in mind.

Following these principles ensures that DoctorProCare remains maintainable, supportable, auditable, and production-ready as the platform grows.
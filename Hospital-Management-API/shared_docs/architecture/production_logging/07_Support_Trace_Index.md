07_Support_Trace_Index.md

DoctorProCare Support Trace Index Framework

Document Type: Technical Design Specification

Version: 1.0

Status: Production Ready

Related Documents

* 00_README.md
* 01_Observability_Architecture.md
* 03_Logger_Framework.md
* 04_Correlation_Framework.md
* 05_Clinical_Audit.md
* 06_Business_Audit.md
* 08_CloudWatch_Integration.md

⸻

Purpose

The Support Trace Index provides a single searchable entry point for production support.

Instead of searching CloudWatch logs directly, support engineers should first search the Support Trace Index using business identifiers such as patient mobile number, consultation ID, booking ID, or report ID.

The Support Trace Index returns the Correlation ID and all related workflow identifiers, allowing rapid investigation across the entire platform.

⸻

Objectives

The Support Trace Index must enable support teams to answer:

* Which consultation belongs to this patient?
* Which recommendation was generated?
* Which laboratory accepted the booking?
* Which report was uploaded?
* Was the WhatsApp notification delivered?
* What is the current workflow status?
* Which Correlation ID should be used to investigate CloudWatch logs?

Support investigations should begin here, not in application logs.

⸻

Why the Support Trace Index Exists

Production logs are optimized for developers.

Support engineers think in terms of business identifiers.

Examples include:

* Patient Mobile Number
* Doctor Mobile Number
* Consultation ID
* Booking Number
* Report Number
* WhatsApp Message ID

Searching CloudWatch using these values is inefficient.

The Support Trace Index bridges business information and technical observability.

⸻

Architecture

Support Engineer
        │
Search using
Patient Mobile
Doctor Mobile
Booking ID
Report ID
Consultation ID
        │
        ▼
Support Trace Index
        │
        ▼
Workflow Summary
        │
        ▼
Correlation ID
        │
 ┌──────┼──────────────┐
 │      │              │
 ▼      ▼              ▼
Clinical Audit   Business Audit   CloudWatch Logs

The Support Trace Index becomes the starting point for every investigation.

⸻

Scope

The index should cover every major DoctorProCare workflow.

Included modules:

* Patient Management
* Consultations
* Prescriptions
* Laboratory Recommendations
* Diagnostic Booking
* Laboratory Assignment
* Sample Collection
* Report Upload
* Report Delivery
* WhatsApp Notifications
* Payments
* Future Mobile Applications

⸻

Design Principles

Principle 1

One record per patient workflow.

⸻

Principle 2

Every record references one Correlation ID.

⸻

Principle 3

Business identifiers are indexed.

⸻

Principle 4

Support searches PostgreSQL.

Developers search CloudWatch.

⸻

Principle 5

The Support Trace Index contains references, not detailed logs.

⸻

Standard Trace Record

Every Support Trace record should include:

* Trace ID
* Correlation ID
* Patient Account ID
* Patient Profile ID
* Patient Mobile Number
* Doctor ID
* Doctor Mobile Number
* Consultation ID
* Encounter ID
* Recommendation ID
* Booking ID
* Laboratory ID
* Laboratory Branch ID
* Report ID
* WhatsApp Message ID
* Current Workflow Status
* Current Workflow Stage
* Created Timestamp
* Last Updated Timestamp

⸻

Searchable Fields

Support engineers should be able to search using:

Patient

* Mobile Number
* Patient Account ID
* Patient Profile ID

Doctor

* Mobile Number
* Doctor ID

Clinical

* Consultation ID
* Encounter ID
* Prescription ID

Marketplace

* Recommendation ID
* Booking ID
* Laboratory ID
* Branch ID

Reports

* Report ID
* Report Artifact ID

Notifications

* WhatsApp Message ID

Payments

* Payment ID
* Transaction ID

General

* Correlation ID
* Date Range

⸻

Workflow Status

Each record should maintain the latest workflow state.

Examples

Recommendation

* Pending
* Generated
* Failed
* Sent

Booking

* Pending
* Submitted
* Confirmed
* Assigned
* Accepted
* Rejected
* Cancelled

Sample Collection

* Scheduled
* Collected
* Missed
* Cancelled

Reports

* Upload Pending
* Uploaded
* Approved
* Delivered

WhatsApp

* Queued
* Sent
* Delivered
* Failed

Payments

* Pending
* Completed
* Failed
* Refunded

⸻

Investigation Workflow

Every production investigation should follow the same sequence.

Patient Mobile Number
↓
Support Trace Index
↓
Workflow Summary
↓
Correlation ID
↓
Clinical Audit Timeline
↓
Business Audit Timeline
↓
CloudWatch Application Logs
↓
Root Cause
↓
Resolution

⸻

Relationship with Other Components

Support Trace Index does not replace other systems.

Component	Responsibility
Support Trace Index	Find the workflow
Clinical Audit	Who performed clinical actions
Business Audit	What happened during the workflow
CloudWatch Logs	How the application behaved
Correlation Framework	Connect every system together

⸻

Update Strategy

The Support Trace Index should be updated whenever significant workflow milestones occur.

Examples:

* Consultation Created
* Consultation Completed
* Recommendation Generated
* Booking Submitted
* Laboratory Accepted
* Sample Collected
* Report Uploaded
* Report Delivered
* WhatsApp Delivered
* Payment Completed

The index should always reflect the latest workflow state.

⸻

Security

Access to the Support Trace Index must be restricted.

Recommended roles:

* Super Administrator
* Helpdesk Administrator
* Authorized Support Staff

Patient-facing applications must never access the Support Trace Index directly.

⸻

Performance

Support searches should return results within a few seconds.

Recommended indexes include:

* Patient Mobile Number
* Doctor Mobile Number
* Consultation ID
* Booking ID
* Report ID
* Correlation ID
* Created Timestamp

The index should support high-volume production environments.

⸻

Future Enhancements

The framework is designed to support:

* Global Search Dashboard
* Customer Support Portal
* Operational Command Center
* SLA Monitoring
* AI-assisted Production Investigation
* Automated Root Cause Suggestions
* Cross-Service Distributed Tracing
* Data Warehouse Integration

These enhancements should not require redesign of the Support Trace Index.

⸻

Acceptance Criteria

The Support Trace Index is considered complete when:

* Every major workflow creates or updates a trace record.
* Support can search using business identifiers.
* Every trace record references a Correlation ID.
* Workflow status is always current.
* Support investigations begin with the Support Trace Index rather than CloudWatch.
* The index links seamlessly to Clinical Audit, Business Audit, and Application Logs.
* Search performance remains fast in production.
* The architecture supports future enterprise expansion.

⸻

Summary

The DoctorProCare Support Trace Index is the operational entry point into the platform’s observability architecture.

It enables support teams to locate patient workflows using familiar business identifiers, provides immediate access to the current workflow state, and bridges the gap between business operations and technical diagnostics through the Correlation Framework.

Together with the Logger Framework, Clinical Audit Framework, Business Audit Framework, and CloudWatch integration, the Support Trace Index enables rapid production support, efficient troubleshooting, and complete end-to-end traceability across the DoctorProCare platform.
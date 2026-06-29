06_Business_Audit.md

DoctorProCare Business Audit Framework

Document Type: Technical Design Specification

Version: 1.0

Status: Production Ready

Related Documents

* 00_README.md
* 01_Observability_Architecture.md
* 02_Logging_Principles.md
* 03_Logger_Framework.md
* 04_Correlation_Framework.md
* 05_Clinical_Audit.md
* 07_Support_Trace_Index.md

⸻

Purpose

This document defines the Business Audit Framework for the DoctorProCare platform.

The Business Audit Framework records significant business events throughout the patient’s healthcare journey. These records provide permanent visibility into marketplace operations, workflow progression, operational decisions, customer support investigations, and business reporting.

Unlike Clinical Audit, which records changes to patient medical records, Business Audit records workflow events such as recommendations, bookings, laboratory assignments, report delivery, payments, and notifications.

⸻

Objectives

The Business Audit Framework must answer the following questions.

* Was a laboratory recommendation generated?
* Which laboratory accepted the booking?
* When was the booking confirmed?
* Was the sample collected?
* Was the report uploaded?
* Was the report delivered to the patient?
* Was the WhatsApp notification successfully delivered?
* Was payment completed?
* Was a refund processed?

Business Audit provides a permanent history of business workflow execution.

⸻

Scope

Business Audit applies to all operational workflows across DoctorProCare.

Included modules:

* Marketplace Recommendation Engine
* Diagnostic Booking
* Laboratory Assignment
* Sample Collection
* Report Upload
* Report Delivery
* WhatsApp Notifications
* Email Notifications
* SMS Notifications
* Payments
* Refunds
* Subscription Management
* Future Partner Integrations

⸻

Business Audit Principles

Principle 1

Every important business milestone must generate a Business Audit event.

⸻

Principle 2

Business Audit is permanent.

Audit records must never be modified or deleted.

⸻

Principle 3

Business Audit is independent of Application Logs.

Application Logs are operational.

Business Audit records business history.

⸻

Principle 4

Business Audit is independent of Clinical Audit.

Clinical Audit records patient-care activities.

Business Audit records business workflow activities.

⸻

Principle 5

Every Business Audit record must reference the Correlation ID.

⸻

Principle 6

Business Audit records are stored in PostgreSQL.

CloudWatch must never be used as permanent business history.

⸻

Principle 7

Audit failures should never interrupt business workflows.

The framework should retry failed audit persistence and notify administrators when necessary.

⸻

Business Audit Architecture

Business Workflow
        │
        ▼
Business Service
        │
        ▼
Business Audit Service
        │
        ▼
Business Audit Database
        │
        ▼
Support Trace Index

Business services should never write directly into audit tables.

All audit creation must go through the Business Audit Service.

⸻

Standard Business Audit Record

Every Business Audit record should include:

* Audit ID
* Timestamp
* Correlation ID
* Module
* Event
* Action
* Status
* Consultation ID
* Encounter ID
* Recommendation ID
* Booking ID
* Laboratory ID
* Laboratory Branch ID
* Report ID
* WhatsApp Message ID
* Payment ID
* User ID (when applicable)
* Source System
* Metadata

⸻

Standard Business Events

Recommendation

* Recommendation Requested
* Recommendation Generated
* Recommendation Failed
* Recommendation Sent

⸻

Diagnostic Booking

* Booking Started
* Booking Submitted
* Booking Confirmed
* Booking Updated
* Booking Cancelled

⸻

Laboratory Routing

* Laboratory Selected
* Laboratory Assigned
* Laboratory Accepted
* Laboratory Rejected
* Laboratory Reassigned

⸻

Sample Collection

* Collection Scheduled
* Collection Rescheduled
* Sample Collected
* Collection Cancelled

⸻

Reports

* Report Upload Started
* Report Uploaded
* Report Approved
* Report Published
* Report Delivered
* Report Downloaded

⸻

WhatsApp

* Message Queued
* Template Sent
* Message Delivered
* Delivery Failed
* Retry Initiated

⸻

Payments

* Payment Initiated
* Payment Completed
* Payment Failed
* Refund Requested
* Refund Processed

⸻

Subscription

* Subscription Created
* Subscription Renewed
* Subscription Cancelled
* Subscription Expired

⸻

Audit Event Lifecycle

Business Event
↓
Business Service
↓
Business Audit Service
↓
PostgreSQL
↓
Support Trace Index
↓
Operational Reporting

Every significant workflow event follows this lifecycle.

⸻

Audit Data Model

Recommended minimum fields:

audit_id
timestamp
correlation_id
module
event
action
status
consultation_id
encounter_id
recommendation_id
booking_id
laboratory_id
branch_id
report_id
whatsapp_message_id
payment_id
user_id
source
metadata

Additional fields may be added as the platform evolves.

⸻

Module Coverage Matrix

Module	Business Audit Required
Recommendation Engine	Yes
Diagnostic Booking	Yes
Laboratory Assignment	Yes
Sample Collection	Yes
Report Upload	Yes
Report Delivery	Yes
WhatsApp	Yes
Email	Yes
SMS	Yes
Payments	Yes
Refunds	Yes
Subscription	Yes

⸻

Correlation Integration

Every Business Audit record must reference:

* Correlation ID
* Consultation ID (when applicable)
* Encounter ID (when applicable)
* Recommendation ID
* Booking ID
* Laboratory ID
* Report ID

This enables complete reconstruction of the operational workflow.

⸻

Relationship with Clinical Audit

Clinical Audit	Business Audit
Patient Record Viewed	Recommendation Generated
Diagnosis Updated	Booking Submitted
Prescription Generated	Laboratory Accepted
Prescription Updated	Sample Collected
Report Viewed	Report Delivered
Report Downloaded	WhatsApp Delivered

Clinical Audit focuses on patient care.

Business Audit focuses on operational workflow.

⸻

Security

Business Audit records must never contain:

* Passwords
* Access Tokens
* JWT Tokens
* OTPs
* Credit Card Information
* Payment Secrets

Metadata should remain concise and avoid unnecessary personal information.

⸻

Retention Policy

Business Audit records are permanent.

Older records may be archived to long-term storage, but they must remain searchable and recoverable.

⸻

Operational Reporting

Business Audit provides the foundation for future operational dashboards.

Examples:

* Daily Consultations
* Recommendation Success Rate
* Booking Conversion Rate
* Laboratory Acceptance Rate
* Sample Collection Success Rate
* Report Delivery Time
* WhatsApp Delivery Rate
* Payment Success Rate
* Refund Rate

No reporting should rely on CloudWatch logs.

⸻

Investigation Workflow

Patient
↓
Support Trace Index
↓
Business Audit Timeline
↓
Clinical Audit Timeline
↓
Application Logs
↓
Root Cause Analysis

Business Audit explains what happened during the operational workflow.

Clinical Audit explains who performed clinical actions.

Application Logs explain how the system behaved internally.

⸻

Future Enhancements

The Business Audit Framework is designed to support future capabilities including:

* Partner Laboratory Analytics
* SLA Monitoring
* Operational KPI Dashboards
* Payment Analytics
* Revenue Reporting
* Customer Journey Analytics
* Event Streaming
* Business Intelligence Integration
* Data Warehouse Export

These enhancements should not require changes to the audit architecture.

⸻

Acceptance Criteria

The Business Audit Framework is complete when:

* Every business workflow generates audit events.
* Business Audit records are immutable.
* All records reference the Correlation ID.
* Business Audit is stored in PostgreSQL.
* Operational workflows can be reconstructed end-to-end.
* Business reporting uses Business Audit data rather than application logs.
* Audit persistence failures do not interrupt business workflows.
* The framework supports future marketplace expansion without redesign.

⸻

Summary

The DoctorProCare Business Audit Framework provides the permanent operational history of the healthcare marketplace.

It records every significant business milestone—from laboratory recommendations through diagnostic bookings, sample collection, report delivery, payments, and notifications—while remaining independent of Clinical Audit and Application Logging.

Together with the Clinical Audit Framework, Correlation Framework, and Logger Framework, Business Audit provides complete end-to-end traceability across both patient care and business operations, forming a robust foundation for production support, operational reporting, and future enterprise scalability.
05_Clinical_Audit.md

DoctorProCare Clinical Audit Framework

Document Type: Technical Design Specification

Version: 1.0

Status: Production Ready

Related Documents

* 00_README.md
* 01_Observability_Architecture.md
* 02_Logging_Principles.md
* 03_Logger_Framework.md
* 04_Correlation_Framework.md
* 06_Business_Audit.md

⸻

Purpose

This document defines the Clinical Audit Framework for the DoctorProCare Electronic Medical Record (EMR) platform.

The Clinical Audit Framework provides a permanent, immutable record of all clinical activities affecting patient care.

Unlike application logs, Clinical Audit records are part of the patient’s clinical history and must remain available for operational review, dispute resolution, and future regulatory compliance.

⸻

Objectives

The Clinical Audit Framework must answer the following questions.

* Who accessed the patient’s medical record?
* Which doctor created the prescription?
* Who modified the diagnosis?
* When was the consultation completed?
* Who uploaded the laboratory report?
* Who downloaded the report?
* Which clinical action occurred?
* When did it occur?

Every clinical event must be permanently traceable.

⸻

Scope

Clinical Audit applies to every workflow involving patient care.

Included modules:

* Authentication
* Patient Management
* Doctor Management
* Consultations
* EMR
* Diagnoses
* Prescriptions
* Laboratory Recommendations
* Diagnostic Orders
* Report Upload
* Report Review
* Report Delivery
* Follow-up Consultations
* Future Mobile Applications

⸻

Clinical Audit Principles

Principle 1

Every clinical action must generate an audit event.

⸻

Principle 2

Audit records are immutable.

They must never be modified or deleted.

⸻

Principle 3

Clinical Audit is separate from Application Logs.

Application Logs are temporary.

Clinical Audit is permanent.

⸻

Principle 4

Every audit event must reference the Correlation ID.

⸻

Principle 5

Audit records must be stored in PostgreSQL.

They must never depend on CloudWatch retention.

⸻

Principle 6

Audit recording failures must never prevent patient care.

If audit persistence temporarily fails, the system should retry and alert administrators.

⸻

Clinical Audit Architecture

Clinical Workflow
        │
        ▼
Clinical Service
        │
        ▼
Clinical Audit Service
        │
        ▼
Clinical Audit Database
        │
        ▼
Support Trace Index

Clinical services never write directly to audit tables.

All audit creation passes through the Clinical Audit Service.

⸻

Standard Audit Record

Every audit record should include:

* Audit ID
* Timestamp
* Correlation ID
* User ID
* User Role
* Patient Account ID
* Patient Profile ID
* Consultation ID
* Encounter ID
* Module
* Event
* Action
* Resource Type
* Resource ID
* Previous Value (optional)
* New Value (optional)
* Source
* IP Address (optional)
* Device Information (optional)

⸻

Standard Event Types

Approved clinical events include:

Authentication

* Login
* Logout
* Failed Login

Patient

* Record Created
* Record Updated
* Record Viewed
* Profile Merged

Consultation

* Consultation Started
* Consultation Completed
* Consultation Cancelled

Diagnosis

* Diagnosis Added
* Diagnosis Updated
* Diagnosis Removed

Prescription

* Prescription Generated
* Prescription Updated
* Prescription Downloaded
* Prescription Shared

Investigations

* Investigation Added
* Investigation Updated
* Investigation Removed

Recommendations

* Laboratory Recommendation Generated
* Laboratory Recommendation Sent

Reports

* Report Uploaded
* Report Approved
* Report Viewed
* Report Downloaded

Follow-up

* Follow-up Scheduled
* Follow-up Completed

⸻

Audit Event Lifecycle

Clinical Action
↓
Clinical Service
↓
Clinical Audit Service
↓
PostgreSQL
↓
Support Trace Index
↓
Available for Investigation

⸻

Audit Data Model

Recommended fields:

audit_id
timestamp
correlation_id
user_id
user_role
patient_account_id
patient_profile_id
consultation_id
encounter_id
module
event
action
resource_type
resource_id
previous_value
new_value
source
ip_address
device_information
remarks

The exact database schema may evolve, but these fields form the minimum audit dataset.

⸻

Module Coverage Matrix

Module	Audit Required
Authentication	Yes
Patient	Yes
Consultation	Yes
Diagnosis	Yes
Prescription	Yes
Recommendation	Yes
Diagnostic Booking	Yes
Laboratory	Yes
Report Upload	Yes
Report Download	Yes
WhatsApp Clinical Delivery	Yes
Follow-up	Yes

⸻

Correlation Integration

Every Clinical Audit record must reference:

* Correlation ID
* Consultation ID
* Encounter ID
* Patient Account ID

This enables complete reconstruction of a patient’s clinical journey.

⸻

Security

Clinical Audit records must never expose:

* Passwords
* OTPs
* Access Tokens
* Refresh Tokens

Sensitive clinical values should be recorded only when required for traceability and must follow applicable privacy and security policies.

⸻

Retention Policy

Clinical Audit records are permanent.

Routine log rotation must never remove audit records.

Future archival strategies may move older records to long-term storage while preserving accessibility.

⸻

Investigation Workflow

Typical investigation process:

Patient
↓
Support Search
↓
Consultation
↓
Clinical Audit Timeline
↓
Business Audit
↓
Application Logs
↓
Root Cause

Clinical Audit explains who performed the clinical action.

Application Logs explain how the system behaved.

⸻

Future Enhancements

The framework supports future additions including:

* Electronic Signatures
* Digital Consent Audit
* Multi-Factor Authentication Audit
* Medication History Tracking
* Regulatory Compliance Reporting
* Immutable Storage
* External SIEM Integration

These enhancements should not require redesign of the audit architecture.

⸻

Acceptance Criteria

The Clinical Audit Framework is considered complete when:

* Every clinical workflow generates audit events.
* Audit records are immutable.
* Every audit record references the Correlation ID.
* Clinical Audit data is stored in PostgreSQL.
* Support teams can reconstruct a complete clinical timeline.
* Audit failures never interrupt patient care.
* The framework supports future regulatory and compliance requirements.

⸻

Summary

The Clinical Audit Framework provides the permanent clinical history of DoctorProCare.

It records every significant healthcare action affecting patient care, separates clinical accountability from operational logging, and enables complete traceability across consultations, prescriptions, investigations, reports, and future clinical workflows.

Together with the Correlation Framework and Business Audit Framework, it forms the foundation of DoctorProCare’s production-grade observability and EMR governance strategy.
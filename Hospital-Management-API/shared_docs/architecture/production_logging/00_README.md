DoctorProCare Production Observability Documentation

Directory: shared_docs/architecture/production_logging/

Version: 1.0

Status: Active

⸻

Overview

Welcome to the DoctorProCare Production Observability Documentation.

This documentation defines the complete architecture for logging, monitoring, clinical audit, business audit, production troubleshooting, and operational observability across the DoctorProCare platform.

The goal of this documentation is to ensure that every production issue can be investigated efficiently while maintaining a permanent and compliant audit trail for all clinical activities.

These documents are implementation guides for developers and operational references for future platform maintenance.

⸻

Why This Documentation Exists

DoctorProCare is an Electronic Medical Record (EMR) and Healthcare Marketplace platform.

Unlike traditional business applications, healthcare systems require:

* Complete visibility into production issues.
* Permanent clinical audit trails.
* Secure handling of patient information.
* End-to-end traceability of patient workflows.
* Fast production support.
* Future regulatory readiness.

This documentation establishes the standards required to achieve these objectives.

⸻

Observability Architecture

DoctorProCare separates observability into four independent layers.

1. Application Logging

Purpose

Technical troubleshooting and system diagnostics.

Examples

* API requests
* API responses
* Celery tasks
* Recommendation Engine
* WhatsApp integration
* Report upload
* Database queries
* Performance metrics

Storage

CloudWatch Logs (Production)

Console Logs (Development)

Retention

30–90 Days

⸻

2. Clinical Audit Trail

Purpose

Permanent clinical accountability.

Examples

* Patient Record Viewed
* Consultation Started
* Consultation Completed
* Prescription Generated
* Prescription Updated
* Prescription Downloaded
* Report Uploaded
* Report Downloaded

Storage

PostgreSQL

Retention

Permanent

⸻

3. Business Audit

Purpose

Permanent marketplace workflow history.

Examples

* Recommendation Generated
* Booking Submitted
* Laboratory Accepted
* Laboratory Rejected
* Report Delivered
* WhatsApp Delivered

Storage

PostgreSQL

Retention

Permanent

⸻

4. Support Trace Index

Purpose

Fast production investigation.

Search by

* Patient Mobile Number
* Doctor Mobile Number
* Consultation ID
* Booking ID
* Report ID
* WhatsApp Message ID

Returns

* Correlation ID
* Consultation
* Encounter
* Booking
* Recommendation
* Current Status

Storage

PostgreSQL

Retention

Permanent

⸻

Documentation Structure

This directory contains the following documents.

File	Description
00_README.md	Documentation overview and navigation
01_Observability_Architecture.md	Governing architecture specification (Logging Bible)
02_Logging_Principles.md	Logging standards and design principles
03_Logger_Framework.md	Shared logging framework implementation
04_Correlation_Framework.md	Correlation ID lifecycle and tracing
05_Clinical_Audit.md	Clinical audit architecture and events
06_Business_Audit.md	Marketplace workflow audit events
07_Support_Trace_Index.md	Searchable production support architecture
08_CloudWatch_Integration.md	Production log storage and monitoring
09_Monitoring_and_Alerts.md	Dashboards, alarms, notifications
10_Implementation_Plan.md	Development roadmap and implementation phases
11_Acceptance_Checklist.md	Production readiness checklist

⸻

Reading Order

The documents should be read in the following order.

1. 00_README.md
2. 01_Observability_Architecture.md
3. 02_Logging_Principles.md
4. 03_Logger_Framework.md
5. 04_Correlation_Framework.md
6. 05_Clinical_Audit.md
7. 06_Business_Audit.md
8. 07_Support_Trace_Index.md
9. 08_CloudWatch_Integration.md
10. 09_Monitoring_and_Alerts.md
11. 10_Implementation_Plan.md
12. 11_Acceptance_Checklist.md

The architecture document is the governing specification.

All remaining documents expand upon that specification.

⸻

Scope

This documentation applies to every DoctorProCare component, including:

* Authentication
* Patient Management
* Doctor Management
* Clinic Management
* Hospital Management
* Consultations
* EMR
* Prescriptions
* Laboratory Recommendation Engine
* Diagnostic Booking
* Routing Engine
* Laboratory Operations
* Report Upload
* Report Delivery
* WhatsApp Notifications
* Celery Workers
* Scheduled Jobs
* REST APIs
* Future Mobile Applications
* Future Partner Integrations

⸻

Design Goals

The observability platform should:

* Be simple to understand.
* Be lightweight to implement.
* Minimize operational overhead.
* Support rapid production troubleshooting.
* Separate technical logging from business auditing.
* Protect patient privacy.
* Scale without architectural redesign.
* Support enterprise observability in the future.

⸻

Production Investigation Workflow

Every production issue should follow the same investigation path.

Patient / Doctor / Support
        │
Search using
• Mobile Number
• Consultation ID
• Booking ID
• Report ID
        │
        ▼
Support Trace Index
        │
        ▼
Correlation ID
        │
        ▼
Clinical Audit Timeline
        │
        ▼
CloudWatch Application Logs
        │
        ▼
Root Cause Analysis
        │
        ▼
Resolution

This approach allows support teams and developers to quickly locate the complete workflow without manually searching multiple systems.

⸻

Future Expansion

The architecture has been designed so that future capabilities can be added without modifying application logging code.

Future enhancements may include:

* CloudWatch Dashboards
* OpenSearch
* Grafana
* Datadog
* OpenTelemetry
* Distributed Tracing
* AI-assisted Log Analysis
* Regulatory Compliance Reporting
* Operational Analytics

⸻

Guiding Principle

DoctorProCare follows one simple philosophy:

Every important business event should be traceable, every clinical action should be auditable, every production failure should be diagnosable, and every patient journey should be reconstructable from a single Correlation ID.

This principle governs all observability, logging, monitoring, and audit implementations across the platform.
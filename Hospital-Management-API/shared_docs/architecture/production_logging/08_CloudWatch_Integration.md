08_CloudWatch_Integration.md

DoctorProCare CloudWatch Integration

Document Type: Technical Design Specification

Version: 1.0

Status: Production Ready

Related Documents

* 00_README.md
* 01_Observability_Architecture.md
* 03_Logger_Framework.md
* 04_Correlation_Framework.md
* 07_Support_Trace_Index.md
* 09_Monitoring_and_Alerts.md

⸻

Purpose

This document defines the CloudWatch integration architecture for the DoctorProCare platform.

Amazon CloudWatch is the primary production destination for application logs, operational diagnostics, infrastructure monitoring, and production troubleshooting.

CloudWatch is not the permanent storage location for Clinical Audit or Business Audit records.

⸻

Objectives

CloudWatch must provide:

* Centralized application logging
* Production troubleshooting
* Error investigation
* Performance monitoring
* Infrastructure monitoring
* Operational visibility
* Alert generation
* Log retention
* Log search

CloudWatch is the operational observability platform.

⸻

Scope

CloudWatch receives logs from:

* Django REST API
* Celery Workers
* Scheduled Jobs
* Recommendation Engine
* WhatsApp Services
* Diagnostic Booking
* Laboratory Services
* Report Upload Services
* AWS Infrastructure
* Future Background Services

CloudWatch does not store permanent audit history.

⸻

Design Principles

Principle 1

Only Application Logs are stored in CloudWatch.

Clinical Audit and Business Audit remain in PostgreSQL.

⸻

Principle 2

Every log is structured JSON.

Plain text logs are prohibited in production.

⸻

Principle 3

Every log includes a Correlation ID.

⸻

Principle 4

CloudWatch failures must never interrupt patient workflows.

⸻

Principle 5

CloudWatch configuration must be environment specific.

Development uses Console logging.

Production uses CloudWatch.

⸻

High-Level Architecture

                     DoctorProCare Platform
             Django API      Celery Workers
                   │               │
                   └──────┬────────┘
                          │
                    Logger Framework
                          │
                    JSON Formatter
                          │
                   CloudWatch Handler
                          │
                 CloudWatch Log Groups
                          │
          ┌───────────────┼────────────────┐
          │               │                │
     Logs Insights     Metric Filters   Alarms
          │               │                │
          └───────────────┼────────────────┘
                          │
                     Operations Team

⸻

Logging Pipeline

Every application log follows the same pipeline.

Application
↓
Shared Logger
↓
Context Injection
↓
Structured JSON
↓
CloudWatch Handler
↓
CloudWatch Log Group
↓
CloudWatch Logs Insights
↓
CloudWatch Alarm (optional)

Application developers never interact with CloudWatch directly.

⸻

Log Groups

Recommended production log groups:

/doctorprocare/application
/doctorprocare/api
/doctorprocare/celery
/doctorprocare/recommendation
/doctorprocare/booking
/doctorprocare/reports
/doctorprocare/whatsapp
/doctorprocare/infrastructure

Each log group should have an appropriate retention policy.

⸻

Standard Log Format

Every CloudWatch log entry should contain:

timestamp
environment
service
module
action
level
message
correlation_id
request_id
consultation_id
encounter_id
booking_id
report_id
execution_time_ms
status
metadata

This schema must remain consistent across all services.

⸻

Log Levels

Supported levels:

* DEBUG
* INFO
* WARNING
* ERROR
* CRITICAL

Production environments should normally disable DEBUG logging.

⸻

Log Retention

Recommended retention periods:

Environment	Retention
Development	7 Days
Test	14 Days
Staging	30 Days
Production	90 Days

Audit records are never retained in CloudWatch.

⸻

Search Strategy

CloudWatch should be searched using:

* Correlation ID
* Request ID
* Consultation ID
* Booking ID
* Report ID
* Module
* Action
* Time Range

Patient mobile numbers should not be the primary search key.

Support teams should first use the Support Trace Index to obtain the Correlation ID.

⸻

Metric Filters

Metric Filters should be created for:

* API Errors
* HTTP 500 Responses
* Celery Failures
* Recommendation Failures
* Booking Failures
* Report Upload Failures
* WhatsApp Failures
* Database Errors

These metrics support CloudWatch alarms.

⸻

CloudWatch Alarms

Production alarms should be configured for:

API

* HTTP 500 Spike
* High Error Rate

Celery

* Worker Failure
* Queue Backlog

Recommendation

* Recommendation Failure Rate

Booking

* Booking Failure Rate

Reports

* Upload Failure
* Storage Failure

WhatsApp

* Delivery Failure
* API Failure

Infrastructure

* EC2 CPU
* EC2 Memory (CloudWatch Agent)
* Disk Usage
* RDS CPU
* RDS Storage
* RDS Connections
* Redis Health

Only actionable alerts should generate notifications.

⸻

CloudWatch Dashboards

Recommended dashboards:

Platform Overview

* API Requests
* Error Rate
* Active Workers
* Recommendation Success
* Booking Success
* WhatsApp Success

Infrastructure

* EC2
* RDS
* Redis
* Storage

Laboratory Operations

* Recommendation Count
* Booking Count
* Report Uploads

Notifications

* WhatsApp Delivery
* Email Delivery
* SMS Delivery

⸻

CloudWatch Logs Insights

Typical investigations include:

* Search by Correlation ID
* Search by Consultation ID
* Search by Booking ID
* Search ERROR logs
* Search CRITICAL logs
* Measure API execution time
* Identify slow database operations
* Investigate Celery failures

CloudWatch Logs Insights should be the primary log analysis tool.

⸻

Security

Application logs must never contain:

* Passwords
* JWT Tokens
* Access Tokens
* OTPs
* Credit Card Information
* Medical Report Contents
* Prescription PDF Contents
* Complete clinical notes

Sensitive information should remain in protected business databases.

⸻

Cost Optimization

To minimize CloudWatch costs:

* Use structured JSON.
* Avoid duplicate logging.
* Do not log entire request or response bodies.
* Log business milestones rather than internal implementation details.
* Use appropriate retention policies.
* Archive older logs if required.

The objective is high-value, low-volume logging.

⸻

Failure Handling

If CloudWatch is temporarily unavailable:

* Continue application execution.
* Attempt retry using the logging handler.
* Continue writing Clinical Audit.
* Continue writing Business Audit.
* Never fail a patient workflow because CloudWatch is unavailable.

Observability must never become a single point of failure.

⸻

Future Integrations

The logging framework should support future integrations with:

* OpenSearch
* Amazon Managed Grafana
* AWS X-Ray / OpenTelemetry
* Datadog
* Splunk
* SIEM Platforms
* AI-assisted Log Analytics

These integrations should require configuration changes only.

⸻

Acceptance Criteria

The CloudWatch integration is complete when:

* Every production service writes structured logs to CloudWatch.
* Every log contains a Correlation ID.
* Log groups are organized by service.
* Retention policies are configured.
* Metric filters are created.
* Critical alarms are configured.
* Dashboards provide operational visibility.
* CloudWatch failures do not interrupt business workflows.
* Clinical Audit and Business Audit remain outside CloudWatch.
* Developers can diagnose production issues using Logs Insights.

⸻

Summary

Amazon CloudWatch is the operational observability platform for DoctorProCare.

It provides centralized storage for structured application logs, production diagnostics, infrastructure monitoring, and operational alerting while remaining independent of the permanent Clinical Audit and Business Audit repositories.

Together with the Logger Framework, Correlation Framework, Support Trace Index, and Monitoring & Alerts architecture, CloudWatch enables rapid production troubleshooting, proactive monitoring, and scalable operational visibility without compromising patient care or audit integrity.
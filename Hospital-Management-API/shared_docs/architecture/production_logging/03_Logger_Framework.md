03_Logger_Framework.md

DoctorProCare Logger Framework

Document Type: Technical Design Specification

Version: 1.0

Status: Production Ready

Related Documents

* 00_README.md
* 01_Observability_Architecture.md
* 02_Logging_Principles.md
* 04_Correlation_Framework.md

⸻

Purpose

This document defines the shared logging framework used throughout the DoctorProCare platform.

The objective is to provide a single, reusable logging library that produces consistent, structured, searchable, and production-ready logs across all services.

Every Django application, Celery worker, scheduled job, API, and future microservice must use this framework.

⸻

Design Goals

The logging framework must be:

* Simple to use
* Lightweight
* Consistent
* Structured
* Fast
* Thread-safe
* Environment independent
* Future proof

Application code must never know where logs are stored.

⸻

Architecture

DoctorProCare Application
            │
            ▼
 Shared Logger Framework
            │
 ┌──────────┼──────────┐
 │          │          │
 ▼          ▼          ▼
Application Clinical  Business
 Logs      Audit      Audit
            │
            ▼
 Structured JSON Events
            │
            ▼
 Logging Handlers
            │
 ┌──────────┼────────────┐
 │          │            │
 ▼          ▼            ▼
Console   CloudWatch   Future Providers

The application communicates only with the shared logger.

⸻

Framework Components

shared/
    logging/
        __init__.py
        logger.py
        context.py
        formatter.py
        handlers.py
        middleware.py
        constants.py
        utils.py
        exceptions.py

Every component has a single responsibility.

⸻

Component Responsibilities

logger.py

Primary interface.

Provides

* info()
* warning()
* error()
* critical()
* debug()
* audit()
* performance()

Application code interacts only with this module.

⸻

context.py

Maintains runtime context.

Stores

* Correlation ID
* Request ID
* User ID
* Consultation ID
* Encounter ID
* Booking ID
* Report ID

Automatically attached to every log.

⸻

formatter.py

Converts log events into structured JSON.

Responsible for:

* Timestamp formatting
* Environment
* Standard fields
* Metadata formatting

⸻

handlers.py

Routes logs to storage providers.

Development

Console

Production

CloudWatch

Future

OpenSearch

Datadog

Grafana

The application remains unchanged.

⸻

middleware.py

Generates request context.

Creates

* Correlation ID
* Request ID

Attaches context to every API request.

⸻

constants.py

Defines

* Log Levels
* Module Names
* Action Names
* Event Types

Removes hardcoded strings.

⸻

utils.py

Common helper methods.

Examples

* Duration calculation
* Metadata cleanup
* Safe serialization

⸻

exceptions.py

Standard exception logging.

Ensures every exception is logged consistently.

⸻

Standard Logger API

The framework exposes a small API.

Application Logs

logger.info(...)
logger.warning(...)
logger.error(...)
logger.critical(...)
logger.debug(...)

Business Audit

logger.audit(...)

Performance

logger.performance(...)

The API should remain stable.

⸻

Standard Log Structure

Every application log must contain:

timestamp
environment
service
module
action
level
message
correlation_id
request_id
user_id
consultation_id
encounter_id
booking_id
report_id
execution_time_ms
status
metadata

Developers should not manually populate common fields.

The framework injects them automatically.

⸻

Standard Metadata

Metadata contains workflow-specific information.

Example

laboratory_id
branch_id
recommendation_score
report_type
template_name
celery_task_id
retry_count
storage_key
api_name

Metadata must remain concise.

Large payloads should never be logged.

⸻

Logger Categories

Supported modules.

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
* authentication
* authorization
* database
* storage
* scheduler
* monitoring
* infrastructure
* security

New modules should follow the same naming convention.

⸻

Logging Flow

Application

↓

Shared Logger

↓

Context Injection

↓

JSON Formatter

↓

Configured Handler

↓

Console / CloudWatch

Every log follows this pipeline.

⸻

Error Logging

Unhandled exceptions should automatically include:

* Correlation ID
* Exception Type
* Stack Trace
* Module
* Action
* Execution Time

Application code should never manually format exceptions.

⸻

Performance Logging

Performance logs should capture:

* API execution time
* Database duration
* Recommendation Engine duration
* Routing duration
* Report upload duration
* WhatsApp API duration
* Celery task duration

Performance metrics should be emitted only for significant workflows.

⸻

Environment Configuration

Development

Output

Console

Readable formatting

Debug enabled

Production

Output

CloudWatch

Structured JSON

Debug disabled

No application code changes required.

⸻

Thread Safety

The framework must support:

* Concurrent API requests
* Celery workers
* Async processing
* Scheduled jobs

Context must remain isolated per request.

⸻

Extension Points

Future providers can be added without changing application code.

Examples

* CloudWatch
* OpenSearch
* Datadog
* Grafana
* OpenTelemetry
* SIEM platforms

Only handlers need implementation.

⸻

Error Handling Strategy

Logging failures must never interrupt business workflows.

If CloudWatch is temporarily unavailable:

* Continue application execution.
* Attempt fallback logging.
* Never fail a patient workflow because logging failed.

Logging is an observability concern, not a business dependency.

⸻

Performance Requirements

The logging framework should:

* Minimize serialization overhead.
* Avoid unnecessary object copying.
* Avoid logging inside tight loops.
* Avoid large payloads.
* Support high-volume concurrent requests.

Logging should have negligible impact on application performance.

⸻

Implementation Guidelines

Developers should:

* Use the shared logger only.
* Never instantiate Python loggers directly.
* Never create custom JSON formats.
* Never duplicate logging logic.
* Never log sensitive information.
* Always include meaningful action names.
* Always use structured metadata.

⸻

Acceptance Criteria

The logger framework is considered complete when:

* Every module uses the shared logger.
* Structured JSON is generated consistently.
* Context fields are automatically injected.
* Console logging works in development.
* CloudWatch integration works in production.
* Logging failures do not interrupt application execution.
* Performance overhead remains minimal.
* The framework supports future observability providers without redesign.

⸻

Summary

The DoctorProCare Logger Framework provides a single, consistent logging interface for the entire platform.

It abstracts storage providers, automatically enriches log records with execution context, enforces structured logging standards, and ensures that every production issue can be investigated efficiently without coupling business logic to the underlying logging implementation.

This framework forms the foundation of DoctorProCare’s production observability strategy and is designed to evolve into an enterprise-grade logging platform without requiring changes to application code.
---
owner: notifications-team
module: notifications
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Business Flow — notifications

## Purpose

WhatsApp message delivery for prescriptions, reports, and future booking notifications. Integrates with Meta Cloud API.

## Actors

| Actor | Role |
|---|---|
| consultations_core / diagnostics_engine | Request send via Celery tasks |
| Celery worker | Calls Meta API |
| Meta webhook | Delivery/read callbacks |
| Patient | Receives template messages |

## Core model

`WhatsAppMessage` — tracks type (PRESCRIPTION, REPORT, TEST_BOOKING, etc.), status lifecycle, provider metadata, soft-delete audit (`deleted_by`).

## Services

| Path | Role |
|---|---|
| `services/delivery/whatsapp_service.py` | Send orchestration |
| `services/delivery/meta_client.py` | HTTP client |
| `services/delivery/prescription_whatsapp_orchestrator.py` | Rx-specific flow |
| `services/delivery/whatsapp_template_renderer.py` | Template params |
| `tasks.py` | Async task entry points |

## Invariant

INV-004 — messages and delivery logs are never hard-deleted; audit trail preserved.

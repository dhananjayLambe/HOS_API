---
owner: platform-team
module: shared_docs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: draft
---

# Notifications Architecture

WhatsApp delivery via Meta Cloud API. Async via Celery.

## Flow

1. consultations_core or diagnostics_engine requests send
2. Celery task queues message
3. Meta API delivers
4. Webhook callback updates append-only delivery log

## Config

See [CONFIGURATION.md](../CONFIGURATION.md) WhatsApp section.

## Invariants

INV-004 — delivery logs never deleted.

See [notifications/docs/WORKFLOWS.md](../../notifications/docs/WORKFLOWS.md).

---
owner: queue_management-team
module: queue_management
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Business Flow — queue_management

## Purpose

Real-time OPD queue for clinics: check-in ordering, WebSocket updates via Django Channels.

## Flow

Appointment checked in → queue entry created/updated → WebSocket broadcast to doctor UI → consultations_core encounter resume/create.

## Technology

Redis Channels layer — see [redis-channels.md](../../shared_docs/integrations/redis-channels.md).

Base API: `/api/queue/`

## Integration

- **Input:** appointments check-in, doctor OPD status
- **Output:** queue position events to frontend; trigger encounter flow

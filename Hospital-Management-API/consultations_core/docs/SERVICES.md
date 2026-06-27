---
owner: consultations_core-team
module: consultations_core
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Services — consultations_core

## EncounterStateMachine

| Responsibility | All encounter status transitions |
|---|---|
| Dependencies | AuditService, queue sync |
| Transaction | `@transaction.atomic` |
| Invalid transitions | Raises ValidationError |

## end_consultation_service

| Responsibility | Finalize Rx, generate PDF, S3 upload, queue WhatsApp |
|---|---|
| Dependencies | S3, notifications, Celery |
| Async | `PRESCRIPTION_WHATSAPP_ASYNC` |

## Investigation / template services

Pre-consultation templates, dynamic validation — see `services/` and parent docs in `HOS_API/docs/backend/`.

## Domain

`domain/audit.py`, `domain/encounter_status.py` — normalization and audit helpers.

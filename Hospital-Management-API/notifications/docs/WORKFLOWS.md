---
owner: notifications-team
module: notifications
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Workflows — notifications

## WhatsApp prescription delivery

Cross-ref: [consultations_core/docs/WORKFLOWS.md](../../consultations_core/docs/WORKFLOWS.md)

## WhatsApp report delivery

Cross-ref: [diagnostics_engine/docs/WORKFLOWS.md](../../diagnostics_engine/docs/WORKFLOWS.md)

## Delivery callback

```mermaid
sequenceDiagram
    participant Meta as WhatsApp_Meta
    participant Notif as notifications
    participant Celery

    Meta->>Notif: Webhook delivery status
    Notif->>Notif: Append delivery log row
    Note over Notif: INV-004 never delete logs
    Notif->>Celery: Optional retry task
```

## Config

[CONFIGURATION.md](../../shared_docs/CONFIGURATION.md), [integrations/whatsapp-meta.md](../../shared_docs/integrations/whatsapp-meta.md)

Base API: `/api/notifications/`, `/api/v1/notifications/`

---
owner: diagnostics_engine-team
module: diagnostics_engine
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Events — diagnostics_engine

See [event_registry.md](../../shared_docs/event_registry.md).

## Published

| Event | Trigger | Subscribers |
|---|---|---|
| DIAGNOSTIC_ORDER_CONFIRMED | Order confirm | labs, notifications |
| REPORT_READY | Mark ready API | notifications |
| REPORT_DELIVERED | Deliver API | notifications, audit |

## Consumed

| Event | Source | Action |
|---|---|---|
| Investigation ordered | consultations_core | Create order from consultation |

## Signals

See `diagnostics_engine/signals.py` for Django signal handlers.

## Celery

Report delivery when `REPORT_DELIVERY_ASYNC=True`.

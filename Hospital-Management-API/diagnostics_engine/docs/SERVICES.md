---
owner: diagnostics_engine-team
module: diagnostics_engine
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Services — diagnostics_engine

## routing/

| Responsibility | Lab eligibility, scoring, assignment creation |
|---|---|
| Dependencies | labs (branches, pricing), patient location |
| Transaction | Atomic routing run + assignment |
| Retry | Routing may be re-triggered on failure |
| Debug | `DIAGNOSTICS_ROUTING_JOURNEY_LOG` env |

## reports/

| Responsibility | Upload validation, S3 storage, delivery, immutability |
|---|---|
| Dependencies | S3, notifications, Celery |
| Transaction | Per-report atomic updates |
| Retry | Delivery retry via append-only logs |

## domain/

| Module | Role |
|---|---|
| `order_status.py` | `OrderStatusAggregationService` — roll up line states |
| `package_orders.py` | Expand packages at confirm |

## CancellationService

Cancels package lines with cascade to test lines. See [WORKFLOWS.md](WORKFLOWS.md).

## Management commands

Catalog sync, routing debug, lab onboarding validation — see `management/commands/`.

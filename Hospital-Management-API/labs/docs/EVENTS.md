---
owner: labs-team
module: labs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Events — labs

## Published

| Event | Trigger | Consumers |
|---|---|---|
| Assignment accepted/rejected | `accept_assignment()` / reject | diagnostics_engine routing status |
| Collection completed | `collection_workflow` | Order `sample_collected` |
| Visit checked in | `visit_workflow` | Test execution provisioning |

## Consumed

| Event | Source |
|---|---|
| Lab assignment created | diagnostics_engine routing |

## Celery / commands

- `auto_reject_stale_lab_assignments` — timeout stale PENDING assignments
- `backfill_home_collection_executions` — data repair

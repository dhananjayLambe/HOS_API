# Home Collections Phase 1 — API Plan

## Scope

Order-level home sample **logistics** only. Execution and reports are separate lifecycles.

## CollectionStatus

```
PENDING | ASSIGNED | IN_PROGRESS | COLLECTED | FAILED | CANCELLED
```

- No `RESCHEDULED` in Phase 1.
- Retry: `FAILED → PENDING` with `retry_count`, `metadata.retries[]`, optional `internal_notes`.

## Provisioning on accept

When `POST /api/labs/orders/<assignment_id>/accept/` succeeds:

1. Assignment → `ACCEPTED`
2. If `sample_collection_mode == home` → `ensure_lab_collection_request()` (`collection_type=HOME`, `PENDING`)
3. `ensure_test_executions_for_assignment()` for every test line (all orders)

Executions are **not** created on collect.

## Workflow service

`labs/services/collection_workflow.py` — all transition rules live here; views are thin.

**Naming:** status `IN_PROGRESS` pairs with timestamp `in_progress_at` (same convention as Visit / Execution workflows).

**Registry:** `ALLOWED_TRANSITIONS` — terminal states `COLLECTED`, `CANCELLED` have no outbound transitions.

**Helpers:** `_ensure_not_terminal`, `_transition`, `_append_workflow_event` → `metadata.workflow_events[]` with `{ from, to, at, actor_id }`.

| Action | Transition |
|--------|------------|
| assign | PENDING → ASSIGNED |
| start | ASSIGNED → IN_PROGRESS (requires assigned phlebotomist) |
| collect | IN_PROGRESS → COLLECTED |
| fail | IN_PROGRESS → FAILED |
| retry | FAILED → PENDING |

Invalid transitions → `CollectionWorkflowError` → HTTP 409.

## Endpoints

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/labs/home-collections/` | Paginated queue; `status`, `date_preset`, `q` |
| GET | `/api/labs/home-collections/summary/` | KPI counts |
| GET | `/api/labs/phlebotomists/` | Branch phlebotomists for assign dialog |
| POST | `/api/labs/home-collections/<id>/assign/` | Body: `{ "phlebotomist_id": "uuid" }` |
| POST | `/api/labs/home-collections/<id>/start/` | |
| POST | `/api/labs/home-collections/<id>/collect/` | |
| POST | `/api/labs/home-collections/<id>/fail/` | Body: `{ "reason": "optional" }` |
| POST | `/api/labs/home-collections/<id>/retry/` | |

Queue visibility: `LabOrderAssignment.status` in `ACCEPTED`, `IN_PROGRESS`.

## Model fields (LabCollectionRequest)

- `collection_type` (default `HOME`)
- `retry_count`, `assigned_at`, `in_progress_at`, `failed_at`, `collected_at`

## Backfill

```bash
python manage.py backfill_home_collection_executions
python manage.py backfill_home_collection_executions --dry-run
```

## Tests

- `labs/tests/test_home_collections_workflow.py` — API integration
- `labs/tests/test_collection_workflow_service.py` — transition graph unit tests

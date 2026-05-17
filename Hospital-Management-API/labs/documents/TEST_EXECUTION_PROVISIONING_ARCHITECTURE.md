# Test Execution Provisioning Architecture

See also: [HOME_ORDER_ACCEPTANCE_WORKFLOW.md](./HOME_ORDER_ACCEPTANCE_WORKFLOW.md) (why executions are not created on accept).

## Purpose

`labs/services/test_execution_provisioning.py` creates **one `LabOrderTestExecution` per `DiagnosticOrderTestLine`**.

Execution is always **test-level**, never order-level. Assignment tracks ownership; collection/visit track logistics; execution tracks medical processing and (future) per-test reports.

## Why assignment is not execution

`LabOrderAssignment` answers: *which lab owns this order?*

`LabOrderTestExecution` answers: *what is the state of this specific test (CBC, MRI, etc.)?*

Storing execution or report state on the assignment would block partial completion, recollection, and multi-lab routing without rewriting core models.

## Workflow link (XOR)

Each execution row links to **exactly one** logistics workflow:

- `collection_request` for home collection, **or**
- `visit_appointment` for branch visit, **or**
- both null only while `execution_status` is `pending` before linkage (DB check constraint enforces never both set).

`ensure_test_executions` requires exactly one of `collection_request` / `visit_appointment` to be passed explicitly (no inference from `DiagnosticOrder`).

## API contract

```python
ensure_test_executions(
    *,
    assignment: LabOrderAssignment,
    collection_request: LabCollectionRequest | None = None,
    visit_appointment: LabVisitAppointment | None = None,
) -> list[LabOrderTestExecution]
```

### Guards

- `assignment.status` must be `LabAssignmentStatus.ACCEPTED`.
- XOR: one workflow FK, not both, not neither.

### Row defaults

- `execution_status` = `pending`
- `execution_type` = `home_collection` or `branch_visit`
- `metadata.execution_source` = `"home_collection"` | `"branch_visit"`
- `metadata.provisioned_at` = ISO timestamp

## When to provision

| Flow | Trigger | Do not provision on |
|------|---------|---------------------|
| Home | `LabCollectionRequest` → `COLLECTED` | ACCEPT, routing, order create |
| Visit | `LabVisitAppointment` → `CHECKED_IN` or `IN_PROGRESS` | ACCEPT, COMPLETED |

Visit hook: call `ensure_test_executions(..., visit_appointment=...)` from the visit workflow when check-in is implemented (not on accept).

## Idempotency

Do **not** use naive `get_or_create(assignment, test_line)` — a terminal row would block new active rows.

Instead:

```python
LabOrderTestExecution.objects.filter(
    assignment=assignment,
    test_line=test_line,
    execution_status__in=ACTIVE_TEST_EXECUTION_STATUSES,
).first()
```

Create only if no active row exists. Aligns with DB constraint `uniq_active_execution_per_test`.

## Database integrity

- Partial unique: one active execution per `(assignment, test_line)`.
- Check: `execution_only_one_workflow_link` (collection XOR visit).

## Example: partial completion

Order: CBC, HbA1c, Lipid Panel → three execution rows after home collection is collected.

Later:

- CBC → `completed`
- HbA1c → `in_processing`
- Lipid → `pending`

Each row evolves independently without splitting `DiagnosticOrder`.

## Future capabilities (no rewrite required)

| Feature | Supported |
|---------|-----------|
| Partial completion | Yes |
| Partial reports | Yes |
| Recollection | Yes (new row when prior terminal) |
| Repeat processing | Yes |
| No-show | Yes (terminal execution + logistics state) |
| Multi-lab routing | Possible per execution row |
| Audit | `execution_source`, `provisioned_at` metadata |

## Related modules

- `labs/services/collection_request_provisioning.py` — home logistics only
- `labs/services/visit_appointment_provisioning.py` — **planned** (Phase 1 stub); symmetric visit logistics
- `labs/services/collection_workflow.py` — transitions; calls execution provisioning on COLLECTED
- `labs/services/workflow_transitions.py` — accept; collection/visit setup only

## Non-goals

No report rows, sample barcodes, signals, or routing engine changes from this service.

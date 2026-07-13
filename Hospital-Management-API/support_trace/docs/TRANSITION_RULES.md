# Transition Rules

Enforced by `WorkflowTransitionValidator` and `SupportTraceRequestValidator`.

## FSM edges

See [STATE_MACHINE.md](STATE_MACHINE.md). Invalid edges raise `WorkflowTransitionError` (fail-open at sync layer unless `raise_on_failure=True`).

## Terminal TraceStatus

Cannot move from Completed / Failed / Cancelled / Expired to a non-terminal status unless `allow_regression=True` on the transition (retry, routing manual override).

## Sequence monotonicity

`last_sequence_no` must not decrease on update (Business Audit sync).

## Parent consistency

`parent_workflow_instance_id` must not equal `workflow_instance_id`.

## Same-state updates

Always allowed (idempotent re-projection).

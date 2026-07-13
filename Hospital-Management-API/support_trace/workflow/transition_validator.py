"""Validate workflow FSM transitions for Support Trace projection."""

from __future__ import annotations

from support_trace.enums import TERMINAL_TRACE_STATUSES, TraceStatus
from support_trace.exceptions import WorkflowTransitionError
from support_trace.models import SupportTrace
from support_trace.workflow.state_machine import is_transition_allowed
from support_trace.workflow.types import WorkflowStateTransition


class WorkflowTransitionValidator:
    """Ensures state transitions respect per-workflow FSMs."""

    @classmethod
    def validate(
        cls,
        *,
        workflow_type: str,
        transition: WorkflowStateTransition,
        existing: SupportTrace | None,
    ) -> None:
        if existing is None:
            return

        from_state = existing.current_state or ""
        to_state = transition.current_state

        if from_state == to_state:
            return

        existing_status = existing.status
        if (
            existing_status in TERMINAL_TRACE_STATUSES
            and transition.trace_status not in TERMINAL_TRACE_STATUSES
            and not transition.allow_regression
        ):
            raise WorkflowTransitionError(
                f"Cannot transition from terminal status {existing_status} "
                f"to {transition.trace_status}."
            )

        if transition.allow_regression:
            return

        if not is_transition_allowed(workflow_type, from_state, to_state):
            raise WorkflowTransitionError(
                f"Invalid transition for {workflow_type}: "
                f"{from_state or '(empty)'} → {to_state}."
            )

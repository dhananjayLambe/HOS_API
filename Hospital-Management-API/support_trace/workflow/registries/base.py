"""Base protocol for per-workflow event registries."""

from __future__ import annotations

from typing import Protocol

from support_trace.workflow.types import WorkflowStateTransition


class WorkflowEventRegistry(Protocol):
    """Maps audit actions to workflow state transitions."""

    workflow_type: str

    def resolve(self, action: str) -> WorkflowStateTransition | None:
        """Return transition for action, or None if unmapped."""
        ...

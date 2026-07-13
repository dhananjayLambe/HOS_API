"""Compatibility shim — prefer transition_validator.WorkflowTransitionValidator."""

from support_trace.workflow.transition_validator import WorkflowTransitionValidator

__all__ = ["WorkflowTransitionValidator"]

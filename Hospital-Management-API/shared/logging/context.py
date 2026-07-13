"""Execution context model for the DoctorProCare logging platform.

Purpose:
    Define the runtime context carried across requests, tasks, and services.

Responsibility:
    Provide LogContext data structure and ContextVar-backed ContextManager.

Future implementation:
    Celery and CLI context providers will restore context in later milestones.
"""

from __future__ import annotations

from contextvars import ContextVar
from dataclasses import dataclass, replace
from typing import Any, Protocol


@dataclass(frozen=True)
class LogContext:
    """Immutable snapshot of execution context for a single workflow.

    Attributes:
        correlation_id: End-to-end workflow identifier.
        request_id: Per-request identifier within a correlation scope.
        user_id: Authenticated user identifier, if available.
        user_role: Role of the authenticated user, if available.
        patient_account_id: Patient account identifier, if applicable.
        patient_profile_id: Patient profile identifier, if applicable.
        consultation_id: Consultation identifier, if applicable.
        encounter_id: Encounter identifier, if applicable.
        recommendation_id: Recommendation identifier, if applicable.
        booking_id: Booking identifier, if applicable.
        laboratory_id: Laboratory identifier, if applicable.
        report_id: Report identifier, if applicable.
        whatsapp_message_id: WhatsApp message identifier, if applicable.
        workflow_instance_id: Runtime workflow execution identifier, if applicable.
        parent_workflow_instance_id: Parent workflow execution for nested workflows.
        tenant: Tenant identifier for multi-tenant deployments.
        environment: Deployment environment (e.g. production, staging).
        deployment: Release or build identifier.
    """

    correlation_id: str | None = None
    request_id: str | None = None
    user_id: str | None = None
    user_role: str | None = None
    patient_account_id: str | None = None
    patient_profile_id: str | None = None
    consultation_id: str | None = None
    encounter_id: str | None = None
    recommendation_id: str | None = None
    booking_id: str | None = None
    laboratory_id: str | None = None
    report_id: str | None = None
    whatsapp_message_id: str | None = None
    workflow_instance_id: str | None = None
    parent_workflow_instance_id: str | None = None
    tenant: str | None = None
    environment: str | None = None
    deployment: str | None = None


_EMPTY_LOG_CONTEXT = LogContext()

_log_context_var: ContextVar[LogContext | None] = ContextVar(
    "doctorprocare_log_context",
    default=None,
)


class ContextProvider(Protocol):
    """Protocol for components that supply execution context."""

    def get(self) -> LogContext:
        """Return the current execution context."""


class ContextManager:
    """Manages read/write access to per-request execution context."""

    def get(self) -> LogContext:
        """Return the current execution context.

        Returns:
            LogContext: Active context, or an empty context when unset.
        """
        context = _log_context_var.get()
        if context is None:
            return _EMPTY_LOG_CONTEXT
        return context

    def set(self, context: LogContext) -> None:
        """Set the active execution context.

        Args:
            context: Context to store for the current execution scope.
        """
        _log_context_var.set(context)

    def clear(self) -> None:
        """Clear the active execution context."""
        _log_context_var.set(None)

    def update(self, **fields: Any) -> None:
        """Merge fields into the active execution context.

        Args:
            **fields: Context field names and values to update.
        """
        current = _log_context_var.get()
        if current is None:
            _log_context_var.set(LogContext(**fields))
        else:
            _log_context_var.set(replace(current, **fields))


_default_context_manager = ContextManager()


def get_context_manager() -> ContextManager:
    """Return the module-level default context manager instance."""
    return _default_context_manager

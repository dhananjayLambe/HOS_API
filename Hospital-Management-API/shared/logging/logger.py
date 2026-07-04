"""Public logging interface for the DoctorProCare logging platform.

Purpose:
    Provide the single entry point for all application logging across the
    platform.

Responsibility:
    Orchestrate validation, LogRecord construction, context enrichment, and
    dispatch. Expose the stable public logging API.

Future implementation:
    JSON formatting, CloudWatch handlers, and audit routing to clinical/business
    audit services.
"""

from __future__ import annotations

from typing import Any

from shared.logging.constants import EventType, LogLevel, LogModule, LogStatus
from shared.logging.context_enricher import (
    ContextEnricher,
    get_default_context_enricher,
    validate_framework_metadata,
)
from shared.logging.dispatcher import LogDispatcher, get_default_dispatcher
from shared.logging.exception_builder import capture_exception, validate_exception_metadata
from shared.logging.record import LogRecord, build_record, enrich_record
from shared.logging.validation import (
    validate_action,
    validate_audit_event,
    validate_audit_type,
    validate_duration_ms,
    validate_event_code,
    validate_message,
    validate_metadata,
    validate_module,
)


class Logger:
    """Primary logging interface for DoctorProCare application code.

    All platform modules must use this class instead of the stdlib logging module.
    """

    def __init__(
        self,
        dispatcher: LogDispatcher | None = None,
        context_enricher: ContextEnricher | None = None,
    ) -> None:
        """Initialize the logger with optional custom dispatcher and enricher.

        Args:
            dispatcher: Dispatcher for routing log records. Defaults to the
                module-level dispatcher with console output.
            context_enricher: Component that supplies context enrichment.
                Defaults to the module-level default enricher.
        """
        self._dispatcher = dispatcher or get_default_dispatcher()
        self._context_enricher = context_enricher or get_default_context_enricher()

    def configure(self, dispatcher: LogDispatcher) -> None:
        """Replace the dispatcher on this logger instance.

        The logger object identity is unchanged; only routing changes.

        Args:
            dispatcher: Dispatcher with configured handlers.
        """
        self._dispatcher = dispatcher

    def _ensure_ready(self) -> None:
        """Lazily configure logging when a pending config was registered."""
        from shared.logging.factory import ensure_configured

        ensure_configured()

    def _dispatch_record(self, record: LogRecord) -> None:
        """Enrich a log record with active context and dispatch it."""
        enriched = enrich_record(record, self._context_enricher.enrich())
        self._dispatcher.dispatch(enriched)

    def debug(
        self,
        message: str,
        *,
        module: LogModule,
        action: str,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        """Log a debug-level application event.

        Args:
            message: Human-readable log message.
            module: Originating module identifier.
            action: Dot-notation action name (e.g. consultation.started).
            metadata: Optional workflow-specific fields.

        Raises:
            LoggingError: If validation fails.
        """
        self._log(
            LogLevel.DEBUG,
            message,
            module=module,
            action=action,
            status=LogStatus.SUCCESS,
            metadata=metadata,
        )

    def info(
        self,
        message: str,
        *,
        module: LogModule,
        action: str,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        """Log an info-level application event.

        Args:
            message: Human-readable log message.
            module: Originating module identifier.
            action: Dot-notation action name.
            metadata: Optional workflow-specific fields.

        Raises:
            LoggingError: If validation fails.
        """
        self._log(
            LogLevel.INFO,
            message,
            module=module,
            action=action,
            status=LogStatus.SUCCESS,
            metadata=metadata,
        )

    def warning(
        self,
        message: str,
        *,
        module: LogModule,
        action: str,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        """Log a warning-level application event.

        Args:
            message: Human-readable log message.
            module: Originating module identifier.
            action: Dot-notation action name.
            metadata: Optional workflow-specific fields.

        Raises:
            LoggingError: If validation fails.
        """
        self._log(
            LogLevel.WARNING,
            message,
            module=module,
            action=action,
            status=LogStatus.SUCCESS,
            metadata=metadata,
        )

    def error(
        self,
        message: str,
        *,
        module: LogModule,
        action: str,
        error_code: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        """Log an error-level application event.

        Args:
            message: Human-readable log message.
            module: Originating module identifier.
            action: Dot-notation action name.
            error_code: Optional machine-readable error code (e.g. DP1001).
            metadata: Optional workflow-specific fields.

        Raises:
            LoggingError: If validation fails.
        """
        self._log(
            LogLevel.ERROR,
            message,
            module=module,
            action=action,
            status=LogStatus.FAILED,
            metadata=metadata,
            event_code=validate_event_code(error_code),
        )

    def critical(
        self,
        message: str,
        *,
        module: LogModule,
        action: str,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        """Log a critical-level application event.

        Args:
            message: Human-readable log message.
            module: Originating module identifier.
            action: Dot-notation action name.
            metadata: Optional workflow-specific fields.

        Raises:
            LoggingError: If validation fails.
        """
        self._log(
            LogLevel.CRITICAL,
            message,
            module=module,
            action=action,
            status=LogStatus.FAILED,
            metadata=metadata,
        )

    def exception(
        self,
        message: str,
        *,
        module: LogModule,
        action: str,
        exc: BaseException | None = None,
        error_code: str | None = None,
        duration_ms: float | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        """Log an exception with stack trace context.

        Args:
            message: Human-readable log message.
            module: Originating module identifier.
            action: Dot-notation action name.
            exc: Optional exception instance to record.
            error_code: Optional machine-readable error code (e.g. DP1001).
            duration_ms: Optional operation duration before failure in milliseconds.
            metadata: Optional workflow-specific fields (business context only).

        Raises:
            LoggingError: If validation fails or no exception is available to log.
        """
        self._ensure_ready()
        validated_message = validate_message(message)
        validated_module = validate_module(module)
        validated_action = validate_action(action)
        safe_metadata = dict(validate_metadata(metadata))
        validate_framework_metadata(safe_metadata)
        validate_exception_metadata(safe_metadata)

        captured = capture_exception(exc=exc)
        validated_duration = (
            validate_duration_ms(duration_ms) if duration_ms is not None else None
        )
        validated_event_code = validate_event_code(error_code)

        record = build_record(
            level=LogLevel.ERROR,
            module=validated_module,
            action=validated_action,
            message=validated_message,
            status=LogStatus.FAILED,
            metadata=safe_metadata,
            event_code=validated_event_code,
            duration_ms=validated_duration,
            exception_type=captured.exception_type,
            exception_message=captured.exception_message,
            stack_trace=captured.stack_trace,
        )
        self._dispatch_record(record)

    def audit(
        self,
        event: str,
        *,
        audit_type: EventType,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        """Record a clinical or business audit event.

        M2 logs audit events through the standard dispatch pipeline.
        Future milestones will route to Clinical Audit or Business Audit services.

        Args:
            event: Audit event name.
            audit_type: Category of audit event.
            metadata: Optional audit-specific fields.

        Raises:
            LoggingError: If validation fails.
        """
        self._ensure_ready()
        validated_event = validate_audit_event(event)
        validated_audit_type = validate_audit_type(audit_type)
        safe_metadata = dict(validate_metadata(metadata))
        validate_framework_metadata(safe_metadata)

        record = build_record(
            level=LogLevel.INFO,
            module=None,
            action=validated_event,
            message=f"Audit event: {validated_event}",
            status=LogStatus.SUCCESS,
            metadata=safe_metadata,
            audit_type=validated_audit_type,
        )
        self._dispatch_record(record)

    def performance(
        self,
        action: str,
        *,
        duration_ms: float,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        """Record a performance metric for a significant workflow.

        Args:
            action: Dot-notation action name for the measured operation.
            duration_ms: Execution duration in milliseconds.
            metadata: Optional performance-specific fields.

        Raises:
            LoggingError: If validation fails.
        """
        self._ensure_ready()
        validated_action = validate_action(action)
        validated_duration = validate_duration_ms(duration_ms)
        safe_metadata = dict(validate_metadata(metadata))
        validate_framework_metadata(safe_metadata)
        safe_metadata["event_type"] = EventType.PERFORMANCE

        record = build_record(
            level=LogLevel.INFO,
            module=None,
            action=validated_action,
            message=f"{validated_action} completed in {validated_duration}ms",
            status=LogStatus.SUCCESS,
            metadata=safe_metadata,
            duration_ms=validated_duration,
        )
        self._dispatch_record(record)

    def _log(
        self,
        level: LogLevel,
        message: str,
        *,
        module: LogModule,
        action: str,
        status: LogStatus,
        metadata: dict[str, Any] | None = None,
        event_code: str | None = None,
    ) -> None:
        """Validate inputs, build a LogRecord, enrich, and dispatch it.

        Args:
            level: Log severity level.
            message: Human-readable log message.
            module: Originating module identifier.
            action: Dot-notation action name.
            status: Workflow outcome status.
            metadata: Optional workflow-specific fields.
            event_code: Optional machine-readable event code.

        Raises:
            LoggingError: If validation fails.
        """
        self._ensure_ready()
        validated_message = validate_message(message)
        validated_module = validate_module(module)
        validated_action = validate_action(action)
        safe_metadata = dict(validate_metadata(metadata))
        validate_framework_metadata(safe_metadata)

        record = build_record(
            level=level,
            module=validated_module,
            action=validated_action,
            message=validated_message,
            status=status,
            metadata=safe_metadata,
            event_code=event_code,
        )
        self._dispatch_record(record)


logger = Logger()

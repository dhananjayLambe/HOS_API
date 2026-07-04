"""Unit tests for shared.logging.logger."""

import json
from unittest.mock import MagicMock

import pytest

from shared.logging import Logger, LogModule
from shared.logging.constants import (
    ACTION_BOOKING_SUBMITTED,
    ACTION_CONSULTATION_STARTED,
    EventType,
)
from shared.logging.context_enricher import ContextEnrichment
from shared.logging.dispatcher import LogDispatcher
from shared.logging.exceptions import HandlerError, LoggingError
from shared.logging.handlers import BaseLogHandler, ConsoleLogHandler


@pytest.fixture
def capture_dispatcher():
    handler = MagicMock(spec=BaseLogHandler)
    dispatcher = LogDispatcher(handlers=[handler])
    return dispatcher, handler


@pytest.fixture
def test_logger(capture_dispatcher):
    dispatcher, _ = capture_dispatcher
    enricher = MagicMock()
    enricher.enrich.return_value = ContextEnrichment.empty()
    return Logger(dispatcher=dispatcher, context_enricher=enricher), capture_dispatcher


@pytest.mark.parametrize(
    ("method_name", "kwargs"),
    [
        ("debug", {"message": "debug msg", "module": LogModule.API, "action": "api.request"}),
        ("info", {"message": "info msg", "module": LogModule.API, "action": "api.request"}),
        ("warning", {"message": "warn msg", "module": LogModule.API, "action": "api.request"}),
        ("error", {"message": "error msg", "module": LogModule.API, "action": "api.request"}),
        ("critical", {"message": "critical msg", "module": LogModule.API, "action": "api.request"}),
        (
            "exception",
            {
                "message": "exception msg",
                "module": LogModule.API,
                "action": "api.request",
                "exc": ValueError("boom"),
            },
        ),
    ],
)
def test_standard_methods_dispatch_record(test_logger, method_name, kwargs) -> None:
    logger_instance, (_, handler) = test_logger
    getattr(logger_instance, method_name)(**kwargs)
    handler.emit_record.assert_called_once()
    record = handler.emit_record.call_args[0][0]
    assert record.action == "api.request"
    assert record.schema_version == 1


def test_audit_dispatches_record(test_logger) -> None:
    logger_instance, (_, handler) = test_logger
    logger_instance.audit("consultation.completed", audit_type=EventType.CLINICAL_AUDIT)
    handler.emit_record.assert_called_once()
    record = handler.emit_record.call_args[0][0]
    assert record.audit_type == EventType.CLINICAL_AUDIT
    assert record.action == "consultation.completed"


def test_performance_dispatches_record(test_logger) -> None:
    logger_instance, (_, handler) = test_logger
    logger_instance.performance(ACTION_BOOKING_SUBMITTED, duration_ms=84.5)
    handler.emit_record.assert_called_once()
    record = handler.emit_record.call_args[0][0]
    assert record.duration_ms == 84.5
    assert record.action == ACTION_BOOKING_SUBMITTED


def test_info_console_output(capsys) -> None:
    console_logger = Logger(dispatcher=LogDispatcher(handlers=[ConsoleLogHandler()]))
    console_logger.info(
        "Consultation started successfully",
        module=LogModule.CONSULTATION,
        action=ACTION_CONSULTATION_STARTED,
    )
    payload = json.loads(capsys.readouterr().out.strip())
    assert payload["level"] == "INFO"
    assert payload["action"] == ACTION_CONSULTATION_STARTED
    assert payload["message"] == "Consultation started successfully"


def test_error_event_code_in_output(capsys) -> None:
    console_logger = Logger(dispatcher=LogDispatcher(handlers=[ConsoleLogHandler()]))
    console_logger.error(
        "Booking failed",
        module=LogModule.BOOKING,
        action="booking.failed",
        error_code="DP1001",
    )
    payload = json.loads(capsys.readouterr().out.strip())
    assert payload["event_code"] == "DP1001"


def test_exception_includes_exception_info(capsys) -> None:
    console_logger = Logger(dispatcher=LogDispatcher(handlers=[ConsoleLogHandler()]))
    console_logger.exception(
        "Something broke",
        module=LogModule.API,
        action="api.failed",
        exc=ValueError("x"),
    )
    payload = json.loads(capsys.readouterr().out.strip())
    assert payload["level"] == "ERROR"
    assert payload["status"] == "FAILED"
    assert payload["message"] == "Something broke"
    assert payload["exception"]["type"] == "ValueError"
    assert payload["exception"]["message"] == "x"
    assert payload["exception"]["stack_trace"]
    assert "stack_trace" not in payload["metadata"]


def test_invalid_module_raises_logging_error(test_logger) -> None:
    logger_instance, _ = test_logger
    with pytest.raises(LoggingError):
        logger_instance.info("msg", module="not_a_valid_module", action="api.request")  # type: ignore[arg-type]


def test_empty_message_raises_logging_error(test_logger) -> None:
    logger_instance, _ = test_logger
    with pytest.raises(LoggingError):
        logger_instance.info("", module=LogModule.API, action="api.request")


def test_invalid_metadata_raises_logging_error(test_logger) -> None:
    logger_instance, _ = test_logger
    with pytest.raises(LoggingError):
        logger_instance.info(
            "msg",
            module=LogModule.API,
            action="api.request",
            metadata="not a dict",  # type: ignore[arg-type]
        )


def test_handler_failure_does_not_raise() -> None:
    failing_handler = MagicMock(spec=BaseLogHandler)
    failing_handler.emit_record.side_effect = HandlerError("output failed")
    resilient_logger = Logger(dispatcher=LogDispatcher(handlers=[failing_handler]))
    resilient_logger.info("msg", module=LogModule.API, action="api.request")


def test_metadata_not_mutated_by_logger(test_logger) -> None:
    logger_instance, (_, handler) = test_logger
    metadata = {"count": 1}
    logger_instance.info(
        "msg",
        module=LogModule.API,
        action="api.request",
        metadata=metadata,
    )
    metadata["count"] = 99
    record = handler.emit_record.call_args[0][0]
    assert record.metadata["count"] == 1


def test_logger_auto_includes_context_from_enricher(capture_dispatcher) -> None:
    dispatcher, handler = capture_dispatcher
    enricher = MagicMock()
    enricher.enrich.return_value = ContextEnrichment(
        correlation_id="corr-abc",
        request_id="req-xyz",
        booking_id="BK123",
    )
    logger_instance = Logger(dispatcher=dispatcher, context_enricher=enricher)
    logger_instance.info("msg", module=LogModule.API, action="api.request")

    record = handler.emit_record.call_args[0][0]
    assert record.correlation_id == "corr-abc"
    assert record.request_id == "req-xyz"
    assert record.booking_id == "BK123"


def test_logger_rejects_correlation_id_in_metadata(test_logger) -> None:
    logger_instance, _ = test_logger
    with pytest.raises(LoggingError, match="reserved key"):
        logger_instance.info(
            "msg",
            module=LogModule.API,
            action="api.request",
            metadata={"correlation_id": "manual-id"},
        )

"""Unit tests for shared.logging.dispatcher."""

from unittest.mock import MagicMock

import pytest

from shared.logging.constants import LogLevel, LogModule, LogStatus
from shared.logging.dispatcher import LogDispatcher
from shared.logging.exceptions import HandlerError
from shared.logging.handlers import BaseLogHandler
from shared.logging.record import build_record


def _sample_record():
    return build_record(
        level=LogLevel.INFO,
        module=LogModule.CONSULTATION,
        action="consultation.started",
        message="Consultation started",
        status=LogStatus.SUCCESS,
    )


def test_dispatcher_calls_all_handlers() -> None:
    handler_a = MagicMock(spec=BaseLogHandler)
    handler_b = MagicMock(spec=BaseLogHandler)
    dispatcher = LogDispatcher(handlers=[handler_a, handler_b])

    record = _sample_record()
    dispatcher.dispatch(record)

    handler_a.emit_record.assert_called_once_with(record)
    handler_b.emit_record.assert_called_once_with(record)


def test_dispatcher_swallows_handler_error() -> None:
    failing = MagicMock(spec=BaseLogHandler)
    failing.emit_record.side_effect = HandlerError("fail")
    succeeding = MagicMock(spec=BaseLogHandler)
    dispatcher = LogDispatcher(handlers=[failing, succeeding])

    dispatcher.dispatch(_sample_record())

    succeeding.emit_record.assert_called_once()


def test_dispatcher_swallows_os_error() -> None:
    failing = MagicMock(spec=BaseLogHandler)
    failing.emit_record.side_effect = OSError("disk full")
    dispatcher = LogDispatcher(handlers=[failing])

    dispatcher.dispatch(_sample_record())


def test_dispatcher_flush_propagates_to_handlers() -> None:
    handler_a = MagicMock(spec=BaseLogHandler)
    handler_b = MagicMock(spec=BaseLogHandler)
    dispatcher = LogDispatcher(handlers=[handler_a, handler_b])

    dispatcher.flush()

    handler_a.flush.assert_called_once()
    handler_b.flush.assert_called_once()


def test_dispatcher_close_propagates_to_handlers() -> None:
    handler_a = MagicMock(spec=BaseLogHandler)
    handler_b = MagicMock(spec=BaseLogHandler)
    dispatcher = LogDispatcher(handlers=[handler_a, handler_b])

    dispatcher.close()

    handler_a.close.assert_called_once()
    handler_b.close.assert_called_once()


def test_dispatcher_flush_isolates_handler_failures() -> None:
    failing = MagicMock(spec=BaseLogHandler)
    failing.flush.side_effect = HandlerError("flush failed")
    succeeding = MagicMock(spec=BaseLogHandler)
    dispatcher = LogDispatcher(handlers=[failing, succeeding])

    dispatcher.flush()

    succeeding.flush.assert_called_once()


def test_dispatcher_console_and_cloudwatch_together() -> None:
    from unittest.mock import MagicMock

    from shared.logging.formatter import JSONLogFormatter
    from shared.logging.handlers import CloudWatchLogHandler, ConsoleLogHandler

    client = MagicMock()
    client.describe_log_groups.return_value = {
        "logGroups": [{"logGroupName": "/doctorprocare/application"}]
    }
    client.create_log_stream.return_value = {}
    client.put_log_events.return_value = {"nextSequenceToken": "t1"}

    cloudwatch = CloudWatchLogHandler(
        log_group="/doctorprocare/application",
        region="ap-south-1",
        formatter=JSONLogFormatter(pretty=False),
        logs_client=client,
        hostname="host",
        date_str="2026-07-01",
    )
    dispatcher = LogDispatcher(handlers=[ConsoleLogHandler(), cloudwatch])
    record = _sample_record()

    dispatcher.dispatch(record)
    dispatcher.flush()

    client.put_log_events.assert_called_once()


def test_module_level_dispatch() -> None:
    from shared.logging.dispatcher import dispatch

    handler = MagicMock(spec=BaseLogHandler)
    from shared.logging.dispatcher import LogDispatcher, get_default_dispatcher

    record = _sample_record()
    original = get_default_dispatcher()
    try:
        import shared.logging.dispatcher as dispatcher_module

        dispatcher_module._default_dispatcher = LogDispatcher(handlers=[handler])
        dispatch(record)
        handler.emit_record.assert_called_once_with(record)
    finally:
        dispatcher_module._default_dispatcher = original


def test_dispatcher_close_isolates_handler_failures() -> None:
    failing = MagicMock(spec=BaseLogHandler)
    failing.close.side_effect = HandlerError("close failed")
    succeeding = MagicMock(spec=BaseLogHandler)
    dispatcher = LogDispatcher(handlers=[failing, succeeding])
    dispatcher.close()
    succeeding.close.assert_called_once()

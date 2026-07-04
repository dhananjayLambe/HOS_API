"""Additional unit tests for handler stubs and client creation."""

import pytest

from shared.logging.formatter import JSONLogFormatter
from shared.logging.handlers import (
    CloudWatchLogHandler,
    DatadogLogHandler,
    OpenSearchLogHandler,
    _create_logs_client,
)
from shared.logging.record import build_record
from shared.logging.constants import LogLevel, LogModule, LogStatus


def test_opensearch_handler_stubs_raise_not_implemented() -> None:
    handler = OpenSearchLogHandler()
    record = build_record(
        level=LogLevel.INFO,
        module=LogModule.API,
        action="api.request",
        message="test",
        status=LogStatus.SUCCESS,
    )
    with pytest.raises(NotImplementedError):
        handler.format_record(record)
    with pytest.raises(NotImplementedError):
        handler.emit("json")
    with pytest.raises(NotImplementedError):
        handler.flush()
    with pytest.raises(NotImplementedError):
        handler.close()


def test_datadog_handler_stubs_raise_not_implemented() -> None:
    handler = DatadogLogHandler()
    with pytest.raises(NotImplementedError):
        handler.emit("json")


def test_create_logs_client_returns_boto3_client() -> None:
    client = _create_logs_client("us-east-1")
    assert client.meta.service_model.service_name == "logs"


def test_cloudwatch_flush_and_close_wrap_errors() -> None:
    from unittest.mock import MagicMock

    from shared.logging.exceptions import HandlerError

    handler = CloudWatchLogHandler(
        log_group="/doctorprocare/application",
        region="ap-south-1",
        formatter=JSONLogFormatter(),
        logs_client=MagicMock(),
        hostname="host",
        date_str="2026-07-01",
    )

    def _raise_flush(*_args, **_kwargs) -> None:
        raise HandlerError("flush failed")

    handler._buffer.flush = _raise_flush  # type: ignore[method-assign]
    with pytest.raises(HandlerError, match="flush failed"):
        handler.flush()


def test_cloudwatch_emit_wraps_unexpected_errors() -> None:
    from unittest.mock import MagicMock

    from shared.logging.exceptions import HandlerError

    handler = CloudWatchLogHandler(
        log_group="/doctorprocare/application",
        region="ap-south-1",
        formatter=JSONLogFormatter(),
        logs_client=MagicMock(),
        hostname="host",
        date_str="2026-07-01",
    )
    handler._buffer.append = MagicMock(side_effect=RuntimeError("boom"))  # type: ignore[method-assign]

    with pytest.raises(HandlerError, match="cloudwatch emit failed"):
        handler.emit('{"message":"x"}')

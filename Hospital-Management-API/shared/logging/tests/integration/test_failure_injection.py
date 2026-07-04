"""Failure injection integration tests."""

from __future__ import annotations

import json
import sys
from unittest.mock import MagicMock

import pytest
from botocore.exceptions import ClientError

from shared.logging import Logger, LogModule
from shared.logging.dispatcher import LogDispatcher
from shared.logging.exceptions import FormatterError, HandlerError
from shared.logging.formatter import JSONLogFormatter
from shared.logging.handlers import CloudWatchLogHandler, ConsoleLogHandler

pytestmark = pytest.mark.integration


def _client_error(code: str) -> ClientError:
    return ClientError({"Error": {"Code": code, "Message": code}}, "PutLogEvents")


def test_cloudwatch_throttling_then_recovery() -> None:
    client = MagicMock()
    client.describe_log_groups.return_value = {
        "logGroups": [{"logGroupName": "/doctorprocare/application"}]
    }
    client.create_log_stream.return_value = {}
    client.put_log_events.side_effect = [
        _client_error("ThrottlingException"),
        {"nextSequenceToken": "t1"},
    ]
    handler = CloudWatchLogHandler(
        log_group="/doctorprocare/application",
        region="ap-south-1",
        formatter=JSONLogFormatter(pretty=False),
        logs_client=client,
        stream_name="test-stream",
    )
    logger = Logger(dispatcher=LogDispatcher(handlers=[handler]))
    logger.info("recover", module=LogModule.API, action="api.request")
    logger._dispatcher.flush()
    assert client.put_log_events.call_count == 2


def test_invalid_credentials_fail_fast_without_crashing_app() -> None:
    client = MagicMock()
    client.describe_log_groups.return_value = {
        "logGroups": [{"logGroupName": "/doctorprocare/application"}]
    }
    client.create_log_stream.return_value = {}
    client.put_log_events.side_effect = _client_error("UnrecognizedClientException")
    handler = CloudWatchLogHandler(
        log_group="/doctorprocare/application",
        region="ap-south-1",
        formatter=JSONLogFormatter(pretty=False),
        logs_client=client,
        stream_name="test-stream",
    )
    logger = Logger(dispatcher=LogDispatcher(handlers=[handler]))
    logger.info("still running", module=LogModule.API, action="api.request")


def test_formatter_failure_wrapped_and_isolated(capsys) -> None:
    formatter = MagicMock(spec=JSONLogFormatter)
    formatter.format.side_effect = FormatterError("bad record")
    handler = ConsoleLogHandler(formatter=formatter)
    logger = Logger(dispatcher=LogDispatcher(handlers=[handler]))
    logger.info("ok", module=LogModule.API, action="api.request")
    assert capsys.readouterr().out == ""


def test_console_write_failure_isolated(monkeypatch) -> None:
    def _fail(_msg: str) -> None:
        raise OSError("stdout broken")

    monkeypatch.setattr(sys.stdout, "write", _fail)
    logger = Logger(dispatcher=LogDispatcher(handlers=[ConsoleLogHandler()]))
    logger.info("continues", module=LogModule.API, action="api.request")


def test_large_stack_trace_valid_json(capsys) -> None:
    logger = Logger(
        dispatcher=LogDispatcher(
            handlers=[ConsoleLogHandler(formatter=JSONLogFormatter(pretty=False))]
        )
    )

    def deep(n: int) -> None:
        if n <= 0:
            raise RuntimeError("deep failure")
        deep(n - 1)

    try:
        deep(30)
    except RuntimeError as exc:
        logger.exception(
            "large trace",
            module=LogModule.API,
            action="api.failed",
            exc=exc,
        )
    payload = json.loads(capsys.readouterr().out.strip())
    assert len(payload["exception"]["stack_trace"]) > 1000

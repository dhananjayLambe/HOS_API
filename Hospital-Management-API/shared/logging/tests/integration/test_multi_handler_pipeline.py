"""Integration tests for multi-handler dispatcher."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from shared.logging.constants import LogLevel, LogModule, LogStatus
from shared.logging.dispatcher import LogDispatcher
from shared.logging.exceptions import HandlerError
from shared.logging.formatter import JSONLogFormatter
from shared.logging.handlers import BaseLogHandler, CloudWatchLogHandler, ConsoleLogHandler
from shared.logging.record import build_record

pytestmark = pytest.mark.integration


def _record():
    return build_record(
        level=LogLevel.INFO,
        module=LogModule.API,
        action="api.request",
        message="multi handler",
        status=LogStatus.SUCCESS,
    )


def test_multi_handler_one_failure_does_not_block_other(capsys) -> None:
    client = MagicMock()
    client.describe_log_groups.return_value = {
        "logGroups": [{"logGroupName": "/doctorprocare/application"}]
    }
    client.create_log_stream.return_value = {}
    client.put_log_events.side_effect = HandlerError("cloudwatch down")

    failing_cw = CloudWatchLogHandler(
        log_group="/doctorprocare/application",
        region="ap-south-1",
        formatter=JSONLogFormatter(pretty=False),
        logs_client=client,
        hostname="host",
        date_str="2026-07-01",
    )
    dispatcher = LogDispatcher(handlers=[failing_cw, ConsoleLogHandler()])
    dispatcher.dispatch(_record())
    out = capsys.readouterr().out
    assert "multi handler" in out


def test_future_handler_stub_does_not_block_console(capsys) -> None:
    class StubHandler(BaseLogHandler):
        def emit(self, formatted_record: str) -> None:
            raise NotImplementedError

        def flush(self) -> None:
            raise NotImplementedError

        def close(self) -> None:
            raise NotImplementedError

    dispatcher = LogDispatcher(handlers=[StubHandler(), ConsoleLogHandler()])
    dispatcher.dispatch(_record())
    assert capsys.readouterr().out

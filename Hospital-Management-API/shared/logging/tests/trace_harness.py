"""Shared harness for Correlation Framework certification tests."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any
from unittest.mock import MagicMock

from shared.logging.dispatcher import LogDispatcher
from shared.logging.formatter import JSONLogFormatter
from shared.logging.handlers import BaseLogHandler, CloudWatchLogHandler
from shared.logging.logger import Logger
from shared.logging.record import LogRecord


class CapturingLogHandler(BaseLogHandler):
    """In-memory handler that stores formatted JSON payloads."""

    def __init__(self, formatter: JSONLogFormatter | None = None) -> None:
        self._formatter = formatter or JSONLogFormatter(pretty=False)
        self.payloads: list[dict[str, Any]] = []
        self.raw_lines: list[str] = []

    def format_record(self, record: LogRecord) -> str:
        return self._formatter.format(record)

    def emit(self, formatted_record: str) -> None:
        self.raw_lines.append(formatted_record)
        self.payloads.append(json.loads(formatted_record))

    def flush(self) -> None:
        return None

    def close(self) -> None:
        return None


@dataclass
class TraceCapture:
    """Collects structured logs for a single certification run."""

    handler: CapturingLogHandler = field(default_factory=CapturingLogHandler)
    logger: Logger = field(init=False)

    def __post_init__(self) -> None:
        self.logger = Logger(dispatcher=LogDispatcher(handlers=[self.handler]))

    @property
    def payloads(self) -> list[dict[str, Any]]:
        return self.handler.payloads

    def correlation_ids(self) -> set[str | None]:
        return {payload.get("correlation_id") for payload in self.payloads}

    def request_ids(self) -> set[str | None]:
        return {payload.get("request_id") for payload in self.payloads}

    def actions(self) -> list[str]:
        return [payload["action"] for payload in self.payloads]

    def assert_single_correlation_id(self, expected: str | None = None) -> str:
        ids = {cid for cid in self.correlation_ids() if cid is not None}
        assert len(ids) == 1, f"expected one correlation_id, found {ids}"
        correlation_id = next(iter(ids))
        if expected is not None:
            assert correlation_id == expected
        return correlation_id

    def assert_all_have_correlation_id(self) -> None:
        missing = [
            payload["action"]
            for payload in self.payloads
            if not payload.get("correlation_id")
        ]
        assert not missing, f"logs missing correlation_id: {missing}"

    def assert_timeline(self, expected_actions: list[str]) -> None:
        assert self.actions() == expected_actions


def mock_cloudwatch_client() -> MagicMock:
    """Return a MagicMock CloudWatch Logs client."""
    client = MagicMock()
    client.describe_log_groups.return_value = {
        "logGroups": [{"logGroupName": "/doctorprocare/application"}]
    }
    client.create_log_stream.return_value = {}
    client.put_log_events.return_value = {"nextSequenceToken": "t1"}
    return client


def cloudwatch_events(client: MagicMock) -> list[dict[str, Any]]:
    """Parse JSON payloads from all mocked CloudWatch put_log_events calls."""
    payloads: list[dict[str, Any]] = []
    for call in client.put_log_events.call_args_list:
        events = call.kwargs.get("logEvents", [])
        payloads.extend(json.loads(event["message"]) for event in events)
    return payloads


def build_cloudwatch_logger(client: MagicMock) -> Logger:
    """Build a logger that writes to a mocked CloudWatch handler."""
    handler = CloudWatchLogHandler(
        log_group="/doctorprocare/application",
        region="ap-south-1",
        formatter=JSONLogFormatter(pretty=False),
        logs_client=client,
        hostname="cert-host",
        date_str="2026-07-04",
    )
    return Logger(dispatcher=LogDispatcher(handlers=[handler]))

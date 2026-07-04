"""Integration tests for console logging pipeline."""

from __future__ import annotations

import json

import pytest

from shared.logging import Logger, LogModule
from shared.logging.constants import ACTION_BOOKING_SUBMITTED, EventType
from shared.logging.dispatcher import LogDispatcher
from shared.logging.formatter import JSONLogFormatter
from shared.logging.handlers import ConsoleLogHandler

pytestmark = pytest.mark.integration


def _console_logger() -> Logger:
    return Logger(
        dispatcher=LogDispatcher(
            handlers=[ConsoleLogHandler(formatter=JSONLogFormatter(pretty=False))]
        )
    )


@pytest.mark.parametrize(
    ("method", "kwargs"),
    [
        ("debug", {"message": "debug", "module": LogModule.API, "action": "api.request"}),
        ("info", {"message": "info", "module": LogModule.API, "action": "api.request"}),
        ("warning", {"message": "warn", "module": LogModule.API, "action": "api.request"}),
        (
            "error",
            {
                "message": "error",
                "module": LogModule.BOOKING,
                "action": "booking.failed",
                "error_code": "DP1001",
            },
        ),
        ("critical", {"message": "critical", "module": LogModule.API, "action": "api.request"}),
    ],
)
def test_console_pipeline_logger_methods(capsys, method, kwargs) -> None:
    getattr(_console_logger(), method)(**kwargs)
    payload = json.loads(capsys.readouterr().out.strip())
    assert payload["schema_version"] == 1
    assert payload["message"] == kwargs["message"]
    json.dumps(payload)


def test_console_pipeline_audit(capsys) -> None:
    _console_logger().audit("booking.submitted", audit_type=EventType.BUSINESS_AUDIT)
    payload = json.loads(capsys.readouterr().out.strip())
    assert payload["action"] == "booking.submitted"
    assert payload["module"] is None


def test_console_pipeline_performance(capsys) -> None:
    _console_logger().performance(ACTION_BOOKING_SUBMITTED, duration_ms=120.0)
    payload = json.loads(capsys.readouterr().out.strip())
    assert payload["duration_ms"] == 120.0

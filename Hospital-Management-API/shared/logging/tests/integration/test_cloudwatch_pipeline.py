"""Integration tests for CloudWatch logging pipeline."""

from __future__ import annotations

import json
from unittest.mock import MagicMock

import pytest

from shared.logging import Logger, LogModule
from shared.logging.dispatcher import LogDispatcher
from shared.logging.formatter import JSONLogFormatter
from shared.logging.handlers import CloudWatchLogHandler

pytestmark = pytest.mark.integration


def _mock_client() -> MagicMock:
    client = MagicMock()
    client.describe_log_groups.return_value = {
        "logGroups": [{"logGroupName": "/doctorprocare/application"}]
    }
    client.create_log_stream.return_value = {}
    client.put_log_events.return_value = {"nextSequenceToken": "t1"}
    return client


def test_cloudwatch_pipeline_preserves_json() -> None:
    client = _mock_client()
    formatter = JSONLogFormatter(pretty=False)
    logger = Logger(
        dispatcher=LogDispatcher(
            handlers=[
                CloudWatchLogHandler(
                    log_group="/doctorprocare/application",
                    region="ap-south-1",
                    formatter=formatter,
                    logs_client=client,
                    hostname="host",
                    date_str="2026-07-01",
                )
            ]
        )
    )
    logger.info("CloudWatch pipeline", module=LogModule.API, action="api.request")
    logger._dispatcher.flush()

    events = client.put_log_events.call_args.kwargs["logEvents"]
    assert len(events) == 1
    payload = json.loads(events[0]["message"])
    assert payload["message"] == "CloudWatch pipeline"
    assert payload["action"] == "api.request"

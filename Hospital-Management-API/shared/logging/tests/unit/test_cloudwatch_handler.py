"""Unit tests for CloudWatchLogHandler and cloudwatch_buffer."""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
from botocore.exceptions import ClientError

from shared.logging.cloudwatch_buffer import (
    MAX_BATCH_SIZE,
    resolve_stream_name,
)
from shared.logging.constants import LogLevel, LogModule, LogStatus
from shared.logging.exceptions import ConfigurationError, HandlerError
from shared.logging.formatter import JSONLogFormatter
from shared.logging.handlers import CloudWatchLogHandler
from shared.logging.record import build_record

LOG_GROUP = "/doctorprocare/application"
REGION = "ap-south-1"
SERVICE = "doctorprocare-api"


def _client_error(code: str, message: str = "error") -> ClientError:
    return ClientError(
        {"Error": {"Code": code, "Message": message}},
        "CloudWatchLogs",
    )


def _sample_record():
    return build_record(
        level=LogLevel.INFO,
        module=LogModule.API,
        action="api.request",
        message="hello cloudwatch",
        status=LogStatus.SUCCESS,
        timestamp=datetime(2026, 7, 1, 12, 0, 0, tzinfo=timezone.utc),
    )


def _mock_logs_client() -> MagicMock:
    client = MagicMock()
    client.describe_log_groups.return_value = {
        "logGroups": [{"logGroupName": LOG_GROUP}]
    }
    client.create_log_stream.return_value = {}
    client.put_log_events.return_value = {"nextSequenceToken": "token-1"}
    return client


def _handler(
    client: MagicMock | None = None,
    *,
    stream_name: str | None = None,
    hostname: str = "ip-10-0-0-1",
    date_str: str = "2026-07-01",
) -> CloudWatchLogHandler:
    return CloudWatchLogHandler(
        log_group=LOG_GROUP,
        region=REGION,
        formatter=JSONLogFormatter(pretty=False),
        stream_name=stream_name,
        service_name=SERVICE,
        logs_client=client or _mock_logs_client(),
        hostname=hostname,
        date_str=date_str,
    )


def test_invalid_constructor_raises_configuration_error() -> None:
    with pytest.raises(ConfigurationError):
        CloudWatchLogHandler(
            log_group="",
            region=REGION,
            formatter=JSONLogFormatter(),
            logs_client=_mock_logs_client(),
        )


def test_resolve_stream_name_default_pattern() -> None:
    assert (
        resolve_stream_name(
            service_name=SERVICE,
            stream_name=None,
            hostname="ip-10-0-0-1",
            date_str="2026-07-01",
        )
        == "doctorprocare-api/ip-10-0-0-1/2026-07-01"
    )


def test_handler_uses_explicit_stream_name() -> None:
    handler = _handler(stream_name="fixed-stream")
    assert handler.stream_name == "fixed-stream"


def test_emit_record_formats_and_buffers_until_flush() -> None:
    client = _mock_logs_client()
    handler = _handler(client)
    handler.emit_record(_sample_record())
    client.put_log_events.assert_not_called()

    handler.flush()
    client.create_log_stream.assert_called_once()
    client.put_log_events.assert_called_once()
    events = client.put_log_events.call_args.kwargs["logEvents"]
    assert len(events) == 1
    assert '"message":"hello cloudwatch"' in events[0]["message"]


def test_batch_flush_when_max_batch_size_reached() -> None:
    client = _mock_logs_client()
    handler = _handler(client)
    record = _sample_record()

    for _ in range(MAX_BATCH_SIZE):
        handler.emit_record(record)

    assert client.put_log_events.call_count == 1
    events = client.put_log_events.call_args.kwargs["logEvents"]
    assert len(events) == MAX_BATCH_SIZE


def test_close_flushes_remaining_events() -> None:
    client = _mock_logs_client()
    handler = _handler(client)
    handler.emit_record(_sample_record())
    handler.close()
    client.put_log_events.assert_called_once()


def test_put_log_events_uses_exact_formatter_output() -> None:
    client = _mock_logs_client()
    formatter = JSONLogFormatter(pretty=False)
    handler = CloudWatchLogHandler(
        log_group=LOG_GROUP,
        region=REGION,
        formatter=formatter,
        service_name=SERVICE,
        logs_client=client,
        hostname="host",
        date_str="2026-07-01",
    )
    record = _sample_record()
    expected = formatter.format(record)
    handler.emit_record(record)
    handler.flush()

    message = client.put_log_events.call_args.kwargs["logEvents"][0]["message"]
    assert message == expected


def test_sequence_token_retry_on_invalid_sequence_token() -> None:
    client = _mock_logs_client()
    client.put_log_events.side_effect = [
        _client_error(
            "InvalidSequenceTokenException",
            "sequenceToken is: expected-token",
        ),
        {"nextSequenceToken": "token-2"},
    ]
    handler = _handler(client)
    handler.emit_record(_sample_record())
    handler.flush()

    assert client.put_log_events.call_count == 2
    second_call = client.put_log_events.call_args_list[1].kwargs
    assert second_call["sequenceToken"] == "expected-token"


def test_access_denied_raises_handler_error() -> None:
    client = _mock_logs_client()
    client.put_log_events.side_effect = _client_error("AccessDeniedException")
    handler = _handler(client)
    handler.emit_record(_sample_record())

    with pytest.raises(HandlerError, match="AccessDeniedException"):
        handler.flush()


def test_missing_log_group_raises_handler_error() -> None:
    client = _mock_logs_client()
    client.describe_log_groups.return_value = {"logGroups": []}
    handler = _handler(client)
    handler.emit_record(_sample_record())

    with pytest.raises(HandlerError, match="log group not found"):
        handler.flush()


def test_transient_error_retried_then_succeeds() -> None:
    client = _mock_logs_client()
    client.put_log_events.side_effect = [
        _client_error("ThrottlingException"),
        {"nextSequenceToken": "token-1"},
    ]
    handler = _handler(client)
    handler.emit_record(_sample_record())
    handler.flush()
    assert client.put_log_events.call_count == 2


def test_create_log_stream_on_first_flush() -> None:
    client = _mock_logs_client()
    handler = _handler(client, hostname="worker-1", date_str="2026-07-02")
    handler.emit_record(_sample_record())
    handler.flush()

    client.create_log_stream.assert_called_once_with(
        logGroupName=LOG_GROUP,
        logStreamName="doctorprocare-api/worker-1/2026-07-02",
    )


def test_append_after_close_is_noop() -> None:
    client = _mock_logs_client()
    handler = _handler(client)
    handler.emit_record(_sample_record())
    handler.close()
    handler.emit('{"message":"after close"}')
    client.put_log_events.assert_called_once()


def test_flush_without_force_skips_when_interval_not_elapsed() -> None:
    from shared.logging.cloudwatch_buffer import CloudWatchLogBuffer

    client = _mock_logs_client()
    buffer = CloudWatchLogBuffer(
        log_group=LOG_GROUP,
        region=REGION,
        service_name=SERVICE,
        stream_name="fixed",
        logs_client=client,
    )
    buffer.append('{"message":"one"}')
    client.put_log_events.assert_not_called()
    buffer.flush(force=False)
    client.put_log_events.assert_not_called()


def test_data_already_accepted_exception_retries() -> None:
    client = _mock_logs_client()
    err = _client_error("DataAlreadyAcceptedException")
    err.response["expectedSequenceToken"] = "tok"
    client.put_log_events.side_effect = [
        err,
        {"nextSequenceToken": "token-2"},
    ]
    handler = _handler(client)
    handler.emit_record(_sample_record())
    handler.flush()
    assert client.put_log_events.call_count == 2


def test_get_hostname_fallback(monkeypatch) -> None:
    from shared.logging import cloudwatch_buffer

    def _fail():
        raise OSError("no host")

    monkeypatch.setattr(cloudwatch_buffer.socket, "gethostname", _fail)
    assert cloudwatch_buffer.get_hostname() == "unknown-host"


def test_call_with_retry_exhausts_on_transient_errors() -> None:
    from shared.logging.cloudwatch_buffer import CloudWatchLogBuffer

    client = _mock_logs_client()
    client.describe_log_groups.side_effect = _client_error("ThrottlingException")
    buffer = CloudWatchLogBuffer(
        log_group=LOG_GROUP,
        region=REGION,
        service_name=SERVICE,
        stream_name="fixed",
        logs_client=client,
        max_put_retries=2,
    )
    with pytest.raises(HandlerError):
        buffer._ensure_log_group()


def test_refresh_sequence_token_from_response_field() -> None:
    from shared.logging.cloudwatch_buffer import CloudWatchLogBuffer

    client = _mock_logs_client()
    buffer = CloudWatchLogBuffer(
        log_group=LOG_GROUP,
        region=REGION,
        service_name=SERVICE,
        stream_name="fixed",
        logs_client=client,
    )
    exc = _client_error("InvalidSequenceTokenException")
    exc.response["expectedSequenceToken"] = "from-response"
    buffer._refresh_sequence_token(exc)
    assert buffer._sequence_token == "from-response"


def test_create_log_stream_resource_already_exists() -> None:
    client = _mock_logs_client()
    client.create_log_stream.side_effect = _client_error("ResourceAlreadyExistsException")
    handler = _handler(client, stream_name="existing")
    handler.emit_record(_sample_record())
    handler.flush()
    client.put_log_events.assert_called_once()


def test_flush_on_closed_empty_buffer_returns_early() -> None:
    from shared.logging.cloudwatch_buffer import CloudWatchLogBuffer

    client = _mock_logs_client()
    buffer = CloudWatchLogBuffer(
        log_group=LOG_GROUP,
        region=REGION,
        service_name=SERVICE,
        stream_name="fixed",
        logs_client=client,
    )
    buffer.close()
    buffer.flush(force=True)
    client.put_log_events.assert_not_called()


def test_put_events_unknown_error_raises_handler_error() -> None:
    from shared.logging.cloudwatch_buffer import CloudWatchLogBuffer

    client = _mock_logs_client()
    client.put_log_events.side_effect = _client_error("SomeOtherError")
    buffer = CloudWatchLogBuffer(
        log_group=LOG_GROUP,
        region=REGION,
        service_name=SERVICE,
        stream_name="fixed",
        logs_client=client,
    )
    buffer.append('{"message":"x"}')
    with pytest.raises(HandlerError):
        buffer.flush(force=True)


def test_refresh_sequence_token_from_message_parsing() -> None:
    from shared.logging.cloudwatch_buffer import CloudWatchLogBuffer

    client = _mock_logs_client()
    buffer = CloudWatchLogBuffer(
        log_group=LOG_GROUP,
        region=REGION,
        service_name=SERVICE,
        stream_name="fixed",
        logs_client=client,
    )
    exc = _client_error("InvalidSequenceTokenException", "sequenceToken is: parsed-token")
    buffer._refresh_sequence_token(exc)
    assert buffer._sequence_token == "parsed-token"


def test_create_log_stream_transient_retry() -> None:
    client = _mock_logs_client()
    client.create_log_stream.side_effect = [
        _client_error("ThrottlingException"),
        {},
    ]
    handler = _handler(client, stream_name="stream-a")
    handler.emit_record(_sample_record())
    handler.flush()
    assert client.create_log_stream.call_count == 2


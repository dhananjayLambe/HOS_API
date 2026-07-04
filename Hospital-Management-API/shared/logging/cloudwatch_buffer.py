"""Internal CloudWatch batch buffer and AWS delivery for the logging platform.

Purpose:
    Buffer formatted JSON log lines and deliver them to CloudWatch Logs.

Responsibility:
    Stream management, batching, sequence tokens, and retry logic.
    Not part of the public API — used by CloudWatchLogHandler only.
"""

from __future__ import annotations

import socket
import threading
import time
from datetime import datetime, timezone
from typing import Any, Protocol

from botocore.exceptions import ClientError

from shared.logging.exceptions import HandlerError

MAX_BATCH_SIZE = 10
FLUSH_INTERVAL_SEC = 2.0
MAX_PUT_RETRIES = 3

_FAIL_FAST_ERROR_CODES = frozenset(
    {
        "AccessDeniedException",
        "UnrecognizedClientException",
        "InvalidParameterException",
        "ResourceNotFoundException",
        "InvalidParameterValueException",
    }
)

_TRANSIENT_ERROR_CODES = frozenset(
    {
        "ThrottlingException",
        "ServiceUnavailableException",
        "InternalServerException",
    }
)


class LogsClientProtocol(Protocol):
    """Minimal CloudWatch Logs client surface for testing."""

    def put_log_events(self, **kwargs: Any) -> dict[str, Any]: ...

    def create_log_stream(self, **kwargs: Any) -> dict[str, Any]: ...

    def describe_log_groups(self, **kwargs: Any) -> dict[str, Any]: ...


def get_hostname() -> str:
    """Return the local hostname for stream naming."""
    try:
        return socket.gethostname()
    except OSError:
        return "unknown-host"


def resolve_stream_name(
    *,
    service_name: str,
    stream_name: str | None,
    hostname: str | None = None,
    date_str: str | None = None,
) -> str:
    """Build the CloudWatch log stream name.

    Default pattern: {service_name}/{hostname}/{YYYY-MM-DD}
    """
    if stream_name and stream_name.strip():
        return stream_name.strip()
    host = hostname or get_hostname()
    day = date_str or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return f"{service_name}/{host}/{day}"


def _client_error_code(exc: ClientError) -> str:
    return exc.response.get("Error", {}).get("Code", "")


def _raise_handler_error(exc: ClientError) -> None:
    code = _client_error_code(exc)
    message = exc.response.get("Error", {}).get("Message", str(exc))
    raise HandlerError(f"cloudwatch {code}: {message}") from exc


class CloudWatchLogBuffer:
    """Thread-safe buffer that batches and sends log events to CloudWatch."""

    def __init__(
        self,
        *,
        log_group: str,
        region: str,
        service_name: str,
        stream_name: str | None,
        logs_client: LogsClientProtocol,
        hostname: str | None = None,
        date_str: str | None = None,
        max_batch_size: int = MAX_BATCH_SIZE,
        flush_interval_sec: float = FLUSH_INTERVAL_SEC,
        max_put_retries: int = MAX_PUT_RETRIES,
    ) -> None:
        self._log_group = log_group
        self._region = region
        self._service_name = service_name
        self._resolved_stream_name = resolve_stream_name(
            service_name=service_name,
            stream_name=stream_name,
            hostname=hostname,
            date_str=date_str,
        )
        self._client = logs_client
        self._max_batch_size = max_batch_size
        self._flush_interval_sec = flush_interval_sec
        self._max_put_retries = max_put_retries

        self._lock = threading.Lock()
        self._buffer: list[dict[str, Any]] = []
        self._last_flush_monotonic = time.monotonic()
        self._sequence_token: str | None = None
        self._stream_ready = False
        self._log_group_verified = False
        self._closed = False

    @property
    def stream_name(self) -> str:
        """Return the resolved log stream name."""
        return self._resolved_stream_name

    def append(self, formatted_record: str) -> None:
        """Append a formatted JSON log line to the buffer."""
        with self._lock:
            if self._closed:
                return
            timestamp_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
            self._buffer.append({"timestamp": timestamp_ms, "message": formatted_record})
            batch_full = len(self._buffer) >= self._max_batch_size
            interval_elapsed = (
                time.monotonic() - self._last_flush_monotonic
            ) >= self._flush_interval_sec
            if batch_full or interval_elapsed:
                self._flush_locked(force=True)

    def flush(self, *, force: bool = False) -> None:
        """Flush buffered events to CloudWatch."""
        with self._lock:
            if self._closed and not self._buffer:
                return
            self._flush_locked(force=force)

    def close(self) -> None:
        """Flush remaining events and mark the buffer closed."""
        with self._lock:
            if self._closed:
                return
            self._flush_locked(force=True)
            self._closed = True

    def _flush_locked(self, *, force: bool) -> None:
        if not self._buffer:
            return
        if not force:
            elapsed = time.monotonic() - self._last_flush_monotonic
            if elapsed < self._flush_interval_sec:
                return

        events = self._buffer
        self._buffer = []
        self._last_flush_monotonic = time.monotonic()

        self._ensure_log_group()
        self._ensure_log_stream()
        self._put_events_with_retry(events)

    def _ensure_log_group(self) -> None:
        if self._log_group_verified:
            return
        response = self._call_with_retry(
            lambda: self._client.describe_log_groups(
                logGroupNamePrefix=self._log_group,
                limit=50,
            )
        )
        groups = response.get("logGroups", [])
        if not any(group.get("logGroupName") == self._log_group for group in groups):
            raise HandlerError(f"cloudwatch log group not found: {self._log_group}")
        self._log_group_verified = True

    def _ensure_log_stream(self) -> None:
        if self._stream_ready:
            return
        try:
            self._client.create_log_stream(
                logGroupName=self._log_group,
                logStreamName=self._resolved_stream_name,
            )
        except ClientError as exc:
            code = _client_error_code(exc)
            if code == "ResourceAlreadyExistsException":
                self._stream_ready = True
                return
            if code in _FAIL_FAST_ERROR_CODES:
                _raise_handler_error(exc)
            if code in _TRANSIENT_ERROR_CODES:
                self._call_with_retry(
                    lambda: self._client.create_log_stream(
                        logGroupName=self._log_group,
                        logStreamName=self._resolved_stream_name,
                    )
                )
                self._stream_ready = True
                return
            _raise_handler_error(exc)
        self._stream_ready = True

    def _put_events_with_retry(self, events: list[dict[str, Any]]) -> None:
        attempt = 0
        while True:
            try:
                self._put_events(events)
                return
            except ClientError as exc:
                code = _client_error_code(exc)
                if code in ("InvalidSequenceTokenException", "DataAlreadyAcceptedException"):
                    self._refresh_sequence_token(exc)
                    attempt += 1
                    if attempt > self._max_put_retries:
                        _raise_handler_error(exc)
                    continue
                if code in _FAIL_FAST_ERROR_CODES:
                    _raise_handler_error(exc)
                if code in _TRANSIENT_ERROR_CODES:
                    attempt += 1
                    if attempt > self._max_put_retries:
                        _raise_handler_error(exc)
                    time.sleep(0.1 * attempt)
                    continue
                _raise_handler_error(exc)

    def _put_events(self, events: list[dict[str, Any]]) -> None:
        kwargs: dict[str, Any] = {
            "logGroupName": self._log_group,
            "logStreamName": self._resolved_stream_name,
            "logEvents": events,
        }
        if self._sequence_token is not None:
            kwargs["sequenceToken"] = self._sequence_token

        response = self._client.put_log_events(**kwargs)
        self._sequence_token = response.get("nextSequenceToken")

    def _refresh_sequence_token(self, exc: ClientError) -> None:
        expected = exc.response.get("expectedSequenceToken")
        if expected:
            self._sequence_token = expected
            return
        message = exc.response.get("Error", {}).get("Message", "")
        if "sequenceToken is:" in message:
            self._sequence_token = message.rsplit("sequenceToken is:", 1)[-1].strip()
            return
        self._sequence_token = None

    def _call_with_retry(self, operation: Any) -> Any:
        last_exc: ClientError | None = None
        for attempt in range(1, self._max_put_retries + 1):
            try:
                return operation()
            except ClientError as exc:
                last_exc = exc
                code = _client_error_code(exc)
                if code in _FAIL_FAST_ERROR_CODES:
                    _raise_handler_error(exc)
                if code not in _TRANSIENT_ERROR_CODES:
                    _raise_handler_error(exc)
                time.sleep(0.1 * attempt)
        if last_exc is not None:
            _raise_handler_error(last_exc)
        raise HandlerError("cloudwatch operation failed")

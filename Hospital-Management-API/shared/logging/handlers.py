"""Log handlers for the DoctorProCare logging platform.

Purpose:
    Route formatted log output to storage and observability destinations.

Responsibility:
    Handlers deliver pre-formatted JSON only. They never build LogRecords,
    inspect metadata, or mutate payloads.

Future implementation:
    OpenSearch, Datadog, Grafana, and Kafka handlers follow BaseLogHandler.
"""

from __future__ import annotations

import sys
from abc import ABC, abstractmethod
from typing import Any

from shared.logging.cloudwatch_buffer import CloudWatchLogBuffer, LogsClientProtocol
from shared.logging.exceptions import FormatterError, HandlerError
from shared.logging.formatter import JSONLogFormatter
from shared.logging.record import LogRecord


class BaseLogHandler(ABC):
    """Abstract base for all log output handlers."""

    @abstractmethod
    def emit(self, formatted_record: str) -> None:
        """Write a formatted log record to the destination.

        Args:
            formatted_record: Pre-formatted log string from a formatter.
        """

    @abstractmethod
    def flush(self) -> None:
        """Flush any buffered log output."""

    @abstractmethod
    def close(self) -> None:
        """Release handler resources."""

    def emit_record(self, record: LogRecord) -> None:
        """Format and emit a LogRecord.

        Args:
            record: Structured log record to output.

        Raises:
            HandlerError: If emission fails.
        """
        self.emit(self.format_record(record))

    def format_record(self, record: LogRecord) -> str:
        """Format a LogRecord for this handler.

        Args:
            record: Structured log record.

        Returns:
            str: Formatted output string.
        """
        raise NotImplementedError


class ConsoleLogHandler(BaseLogHandler):
    """Writes formatted JSON logs to standard output."""

    def __init__(self, formatter: JSONLogFormatter | None = None) -> None:
        """Initialize the console handler.

        Args:
            formatter: JSON formatter instance. Defaults to pretty JSON for
                development-friendly console output.
        """
        self._formatter = formatter or JSONLogFormatter(pretty=True)

    def format_record(self, record: LogRecord) -> str:
        """Format a LogRecord as JSON via the configured formatter.

        Args:
            record: Structured log record.

        Returns:
            str: JSON-encoded log line.
        """
        return self._formatter.format(record)

    def emit(self, formatted_record: str) -> None:
        """Emit a log record to the console.

        Args:
            formatted_record: Pre-formatted log string.

        Raises:
            HandlerError: If writing to stdout fails.
        """
        try:
            sys.stdout.write(f"{formatted_record}\n")
            sys.stdout.flush()
        except OSError as exc:
            raise HandlerError(f"console emit failed: {exc}") from exc

    def emit_record(self, record: LogRecord) -> None:
        """Format and emit a LogRecord to the console.

        Args:
            record: Structured log record.

        Raises:
            HandlerError: If formatting or emission fails.
        """
        try:
            self.emit(self.format_record(record))
        except FormatterError as exc:
            raise HandlerError(str(exc)) from exc

    def flush(self) -> None:
        """Flush console output buffers."""
        try:
            sys.stdout.flush()
        except OSError as exc:
            raise HandlerError(f"console flush failed: {exc}") from exc

    def close(self) -> None:
        """Close the console handler (no-op for stdout)."""


class CloudWatchLogHandler(BaseLogHandler):
    """Writes formatted logs to Amazon CloudWatch Logs (M6 production handler)."""

    def __init__(
        self,
        *,
        log_group: str,
        region: str,
        formatter: JSONLogFormatter,
        stream_name: str | None = None,
        service_name: str = "doctorprocare-api",
        logs_client: LogsClientProtocol | None = None,
        hostname: str | None = None,
        date_str: str | None = None,
    ) -> None:
        """Initialize CloudWatch handler.

        Args:
            log_group: Target CloudWatch log group name (infrastructure-managed).
            region: AWS region for CloudWatch Logs.
            formatter: JSON formatter for log records.
            stream_name: Optional fixed log stream name.
            service_name: Service name for default stream naming.
            logs_client: Optional boto3 logs client (for testing).
            hostname: Optional hostname override for stream naming (testing).
            date_str: Optional date override for stream naming (testing).

        Raises:
            ConfigurationError: If required configuration is missing.
        """
        from shared.logging.exceptions import ConfigurationError

        if not log_group or not log_group.strip():
            raise ConfigurationError("cloudwatch log_group must not be empty")
        if not region or not region.strip():
            raise ConfigurationError("cloudwatch region must not be empty")

        self._formatter = formatter
        client = logs_client if logs_client is not None else _create_logs_client(region.strip())

        self._buffer = CloudWatchLogBuffer(
            log_group=log_group.strip(),
            region=region.strip(),
            service_name=service_name,
            stream_name=stream_name,
            logs_client=client,
            hostname=hostname,
            date_str=date_str,
        )

    @property
    def stream_name(self) -> str:
        """Return the resolved CloudWatch log stream name."""
        return self._buffer.stream_name

    def format_record(self, record: LogRecord) -> str:
        """Format a LogRecord as JSON via the configured formatter."""
        return self._formatter.format(record)

    def emit(self, formatted_record: str) -> None:
        """Buffer a pre-formatted JSON log line for CloudWatch delivery."""
        try:
            self._buffer.append(formatted_record)
        except HandlerError:
            raise
        except Exception as exc:
            raise HandlerError(f"cloudwatch emit failed: {exc}") from exc

    def emit_record(self, record: LogRecord) -> None:
        """Format and buffer a LogRecord for CloudWatch delivery."""
        try:
            self.emit(self.format_record(record))
        except FormatterError as exc:
            raise HandlerError(str(exc)) from exc

    def flush(self) -> None:
        """Flush buffered log events to CloudWatch."""
        try:
            self._buffer.flush(force=True)
        except HandlerError:
            raise
        except Exception as exc:
            raise HandlerError(f"cloudwatch flush failed: {exc}") from exc

    def close(self) -> None:
        """Flush remaining events and release resources."""
        try:
            self._buffer.close()
        except HandlerError:
            raise
        except Exception as exc:
            raise HandlerError(f"cloudwatch close failed: {exc}") from exc


def _create_logs_client(region: str) -> Any:
    """Create a boto3 CloudWatch Logs client with standard SDK credentials."""
    import boto3
    from botocore.config import Config

    config = Config(retries={"mode": "adaptive", "max_attempts": 3})
    return boto3.client("logs", region_name=region, config=config)


class OpenSearchLogHandler(BaseLogHandler):
    """Writes formatted logs to OpenSearch."""

    def format_record(self, record: LogRecord) -> str:
        raise NotImplementedError

    def emit(self, formatted_record: str) -> None:
        raise NotImplementedError

    def flush(self) -> None:
        raise NotImplementedError

    def close(self) -> None:
        raise NotImplementedError


class DatadogLogHandler(BaseLogHandler):
    """Writes formatted logs to Datadog."""

    def format_record(self, record: LogRecord) -> str:
        raise NotImplementedError

    def emit(self, formatted_record: str) -> None:
        raise NotImplementedError

    def flush(self) -> None:
        raise NotImplementedError

    def close(self) -> None:
        raise NotImplementedError

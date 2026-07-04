"""Log formatters for the DoctorProCare logging platform.

Purpose:
    Convert structured LogRecord instances into output-ready string representations.

Responsibility:
    Serialization only. Formatters never write output or perform validation.

Future implementation:
    Additional formatters (PlainText, ECS, OTEL) support alternate destinations.
"""

from __future__ import annotations

import json
from abc import ABC, abstractmethod
from datetime import date, datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import Any
from uuid import UUID

from shared.logging.constants import CONTEXT_FIELD_NAMES
from shared.logging.exceptions import FormatterError
from shared.logging.record import LogRecord

SCHEMA_FIELDS = (
    "schema_version",
    "timestamp",
    "level",
    "module",
    "action",
    "status",
    "message",
    "event_code",
    "metadata",
)

CONTEXT_FIELDS = CONTEXT_FIELD_NAMES


class BaseLogFormatter(ABC):
    """Abstract base for all log record formatters."""

    @abstractmethod
    def format(self, record: LogRecord) -> str:
        """Convert a LogRecord to a formatted string.

        Args:
            record: Immutable structured log record.

        Returns:
            str: Formatted log output ready for handler emission.
        """


def _format_timestamp(dt: datetime) -> str:
    """Format a datetime as ISO-8601 UTC with Z suffix.

    Args:
        dt: Timezone-aware or naive datetime.

    Returns:
        str: ISO-8601 UTC timestamp (e.g. 2026-07-01T12:45:21.123456Z).
    """
    if dt.tzinfo is None:
        utc_dt = dt.replace(tzinfo=timezone.utc)
    else:
        utc_dt = dt.astimezone(timezone.utc)
    formatted = utc_dt.isoformat(timespec="microseconds")
    return formatted.replace("+00:00", "Z")


def _json_default(obj: object) -> object:
    """Safe JSON serialization fallback for supported Python types.

    Args:
        obj: Value to serialize.

    Returns:
        object: JSON-serializable representation.
    """
    if isinstance(obj, UUID):
        return str(obj)
    if isinstance(obj, datetime):
        return _format_timestamp(obj)
    if isinstance(obj, date):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return str(obj)
    if isinstance(obj, Enum):
        return obj.value
    if isinstance(obj, tuple):
        return list(obj)
    return str(obj)


def _context_payload(record: LogRecord) -> dict[str, str]:
    """Build optional context fields for JSON output (omit null/empty values)."""
    payload: dict[str, str] = {}
    for field in CONTEXT_FIELDS:
        value = getattr(record, field)
        if value is not None and value != "":
            payload[field] = value
    return payload


def _record_to_payload(record: LogRecord) -> dict[str, Any]:
    """Map a LogRecord to the DoctorProCare JSON logging schema.

    Args:
        record: Immutable structured log record.

    Returns:
        dict[str, Any]: Schema payload without mutating the record.
    """
    payload: dict[str, Any] = {
        "schema_version": record.schema_version,
        "timestamp": _format_timestamp(record.timestamp),
    }
    payload.update(_context_payload(record))
    payload.update(
        {
            "level": record.level.value,
            "module": record.module.value if record.module is not None else None,
            "action": record.action,
            "status": record.status.value,
            "message": record.message,
            "event_code": record.event_code,
            "metadata": dict(record.metadata),
        }
    )

    if record.duration_ms is not None:
        payload["duration_ms"] = record.duration_ms

    if (
        record.exception_type is not None
        or record.exception_message is not None
        or record.stack_trace is not None
    ):
        payload["exception"] = {
            "type": record.exception_type,
            "message": record.exception_message,
            "stack_trace": record.stack_trace,
        }

    return payload


class JSONLogFormatter(BaseLogFormatter):
    """Structured JSON formatter for production observability."""

    def __init__(self, *, pretty: bool = False) -> None:
        """Initialize the JSON formatter.

        Args:
            pretty: When True, emit indented JSON for development.
                When False, emit compact single-line JSON for production.
        """
        self._pretty = pretty

    def format(self, record: LogRecord) -> str:
        """Format a LogRecord as JSON.

        Args:
            record: Immutable structured log record.

        Returns:
            str: JSON-encoded log line.

        Raises:
            FormatterError: If record is invalid or serialization fails.
        """
        if not isinstance(record, LogRecord):
            raise FormatterError("record must be a LogRecord instance")
        try:
            payload = _record_to_payload(record)
            if self._pretty:
                return json.dumps(
                    payload,
                    default=_json_default,
                    ensure_ascii=False,
                    indent=2,
                    sort_keys=False,
                )
            return json.dumps(
                payload,
                default=_json_default,
                ensure_ascii=False,
                separators=(",", ":"),
                sort_keys=False,
            )
        except (TypeError, ValueError) as exc:
            raise FormatterError(f"JSON serialization failed: {exc}") from exc


class PlainTextLogFormatter(BaseLogFormatter):
    """Human-readable plain text formatter for development."""

    def format(self, record: LogRecord) -> str:
        """Format a LogRecord as plain text.

        Args:
            record: Immutable structured log record.

        Returns:
            str: Plain text log line.

        Raises:
            NotImplementedError: Plain text formatting is not yet implemented.
        """
        raise NotImplementedError


class ECSLogFormatter(BaseLogFormatter):
    """Elastic Common Schema formatter for OpenSearch and SIEM integration."""

    def format(self, record: LogRecord) -> str:
        """Format a LogRecord using ECS field conventions.

        Args:
            record: Immutable structured log record.

        Returns:
            str: ECS-formatted log line.

        Raises:
            NotImplementedError: ECS formatting is not yet implemented.
        """
        raise NotImplementedError


class OTELLogFormatter(BaseLogFormatter):
    """OpenTelemetry-compatible formatter for distributed tracing integration."""

    def format(self, record: LogRecord) -> str:
        """Format a LogRecord for OpenTelemetry export.

        Args:
            record: Immutable structured log record.

        Returns:
            str: OTEL-formatted log line.

        Raises:
            NotImplementedError: OTEL formatting is not yet implemented.
        """
        raise NotImplementedError

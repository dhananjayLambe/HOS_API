"""Unit tests for shared.logging.formatter."""

from __future__ import annotations

import json
from dataclasses import FrozenInstanceError, replace
from datetime import date, datetime, timezone
from decimal import Decimal
from enum import Enum
from uuid import UUID, uuid4

import pytest

from shared.logging.constants import (
    CONTEXT_FIELD_NAMES,
    SCHEMA_VERSION,
    EventType,
    LogLevel,
    LogModule,
    LogStatus,
)
from shared.logging.exceptions import FormatterError
from shared.logging.formatter import JSONLogFormatter, SCHEMA_FIELDS, _format_timestamp
from shared.logging.record import LogRecord, build_record


def _sample_record(**overrides) -> LogRecord:
    context_overrides = {
        key: overrides.pop(key)
        for key in list(overrides)
        if key in CONTEXT_FIELD_NAMES
    }
    defaults = {
        "level": LogLevel.INFO,
        "module": LogModule.CONSULTATION,
        "action": "consultation.started",
        "message": "Consultation started successfully",
        "status": LogStatus.SUCCESS,
        "timestamp": datetime(2026, 7, 1, 12, 45, 21, 123456, tzinfo=timezone.utc),
    }
    defaults.update(overrides)
    record = build_record(**defaults)
    if context_overrides:
        record = replace(record, **context_overrides)
    return record


def test_format_produces_valid_json() -> None:
    formatter = JSONLogFormatter()
    payload = json.loads(formatter.format(_sample_record()))
    assert isinstance(payload, dict)


def test_schema_fields_present() -> None:
    formatter = JSONLogFormatter()
    payload = json.loads(formatter.format(_sample_record()))
    assert list(payload.keys()) == list(SCHEMA_FIELDS)


def test_context_fields_omitted_when_absent() -> None:
    formatter = JSONLogFormatter()
    payload = json.loads(formatter.format(_sample_record()))
    assert "correlation_id" not in payload
    assert "request_id" not in payload


def test_context_fields_serialized_after_timestamp() -> None:
    formatter = JSONLogFormatter()
    record = _sample_record(
        correlation_id="corr-1",
        request_id="req-1",
        booking_id="BK123",
    )
    payload = json.loads(formatter.format(record))
    keys = list(payload.keys())
    timestamp_index = keys.index("timestamp")
    assert keys[timestamp_index + 1 : timestamp_index + 4] == [
        "correlation_id",
        "request_id",
        "booking_id",
    ]
    assert payload["correlation_id"] == "corr-1"
    assert payload["request_id"] == "req-1"
    assert payload["booking_id"] == "BK123"


def test_exception_log_includes_context_fields() -> None:
    formatter = JSONLogFormatter()
    record = _sample_record(
        level=LogLevel.ERROR,
        status=LogStatus.FAILED,
        message="Failed",
        correlation_id="corr-err",
        exception_type="ValueError",
        exception_message="bad",
        stack_trace="Traceback...",
    )
    payload = json.loads(formatter.format(record))
    assert payload["correlation_id"] == "corr-err"
    assert "exception" in payload


def test_duration_ms_in_payload_when_present() -> None:
    formatter = JSONLogFormatter()
    record = _sample_record(duration_ms=120.5)
    payload = json.loads(formatter.format(record))
    assert payload["duration_ms"] == 120.5
    assert list(payload.keys()) == list(SCHEMA_FIELDS) + ["duration_ms"]


def test_exception_object_in_payload_when_present() -> None:
    formatter = JSONLogFormatter()
    record = _sample_record(
        level=LogLevel.ERROR,
        status=LogStatus.FAILED,
        message="Failed",
        exception_type="ValueError",
        exception_message="bad",
        stack_trace="Traceback (most recent call last):\n  ...",
    )
    payload = json.loads(formatter.format(record))
    assert payload["exception"] == {
        "type": "ValueError",
        "message": "bad",
        "stack_trace": "Traceback (most recent call last):\n  ...",
    }
    assert "exception" not in SCHEMA_FIELDS
def test_compact_mode() -> None:
    formatter = JSONLogFormatter(pretty=False)
    output = formatter.format(_sample_record())
    assert "\n" not in output.strip()


def test_pretty_mode() -> None:
    formatter = JSONLogFormatter(pretty=True)
    output = formatter.format(_sample_record())
    assert "\n" in output
    assert "  " in output


def test_timestamp_iso8601_utc() -> None:
    formatter = JSONLogFormatter()
    payload = json.loads(formatter.format(_sample_record()))
    assert payload["timestamp"].endswith("Z")
    assert payload["timestamp"] == "2026-07-01T12:45:21.123456Z"


def test_format_timestamp_naive_datetime() -> None:
    naive = datetime(2026, 7, 1, 12, 45, 21, 123456)
    assert _format_timestamp(naive) == "2026-07-01T12:45:21.123456Z"


def test_schema_version() -> None:
    formatter = JSONLogFormatter()
    payload = json.loads(formatter.format(_sample_record()))
    assert payload["schema_version"] == SCHEMA_VERSION


def test_metadata_preserved() -> None:
    metadata = {"reference_code": "REF123", "retry": 2}
    record = _sample_record(metadata=metadata)
    formatter = JSONLogFormatter()
    payload = json.loads(formatter.format(record))
    assert payload["metadata"] == metadata
    assert list(payload["metadata"].keys()) == ["reference_code", "retry"]


def test_event_code_null_and_set() -> None:
    formatter = JSONLogFormatter()
    without_code = json.loads(formatter.format(_sample_record()))
    assert without_code["event_code"] is None

    with_code = json.loads(formatter.format(_sample_record(event_code="DP1001")))
    assert with_code["event_code"] == "DP1001"


def test_module_null_for_audit() -> None:
    formatter = JSONLogFormatter()
    record = _sample_record(module=None, action="consultation.completed")
    payload = json.loads(formatter.format(record))
    assert payload["module"] is None


def test_uuid_serialization() -> None:
    value = uuid4()
    record = _sample_record(metadata={"id": value})
    payload = json.loads(JSONLogFormatter().format(record))
    assert payload["metadata"]["id"] == str(value)


def test_decimal_serialization() -> None:
    record = _sample_record(metadata={"amount": Decimal("19.99")})
    payload = json.loads(JSONLogFormatter().format(record))
    assert payload["metadata"]["amount"] == "19.99"


def test_enum_serialization() -> None:
    class SampleEnum(Enum):
        ACTIVE = "active"

    record = _sample_record(metadata={"state": SampleEnum.ACTIVE})
    payload = json.loads(JSONLogFormatter().format(record))
    assert payload["metadata"]["state"] == "active"


def test_datetime_in_metadata() -> None:
    dt = datetime(2026, 1, 15, 8, 30, 0, tzinfo=timezone.utc)
    record = _sample_record(metadata={"created_at": dt})
    payload = json.loads(JSONLogFormatter().format(record))
    assert payload["metadata"]["created_at"] == "2026-01-15T08:30:00.000000Z"


def test_date_in_metadata() -> None:
    record = _sample_record(metadata={"day": date(2026, 1, 15)})
    payload = json.loads(JSONLogFormatter().format(record))
    assert payload["metadata"]["day"] == "2026-01-15"


def test_unknown_object_fallback() -> None:
    class CustomObject:
        def __str__(self) -> str:
            return "custom-value"

    record = _sample_record(metadata={"obj": CustomObject()})
    payload = json.loads(JSONLogFormatter().format(record))
    assert payload["metadata"]["obj"] == "custom-value"


def test_record_not_mutated() -> None:
    metadata = {"count": 1}
    record = _sample_record(metadata=metadata)
    original_message = record.message
    JSONLogFormatter().format(record)
    assert record.message == original_message
    assert record.metadata["count"] == 1


def test_metadata_dict_not_mutated_on_record() -> None:
    metadata = {"count": 1}
    record = _sample_record(metadata=metadata)
    JSONLogFormatter().format(record)
    metadata["count"] = 99
    assert record.metadata["count"] == 1


def test_invalid_record_raises_formatter_error() -> None:
    formatter = JSONLogFormatter()
    with pytest.raises(FormatterError):
        formatter.format("not a record")  # type: ignore[arg-type]


def test_deterministic_compact_output() -> None:
    formatter = JSONLogFormatter(pretty=False)
    record = _sample_record()
    assert formatter.format(record) == formatter.format(record)


def test_audit_type_not_in_top_level_schema() -> None:
    record = _sample_record(audit_type=EventType.CLINICAL_AUDIT)
    payload = json.loads(JSONLogFormatter().format(record))
    assert "audit_type" not in payload


def test_log_record_remains_frozen_after_format() -> None:
    record = _sample_record()
    JSONLogFormatter().format(record)
    with pytest.raises(FrozenInstanceError):
        record.message = "changed"  # type: ignore[misc]


def test_plaintext_formatter_not_implemented() -> None:
    from shared.logging.formatter import PlainTextLogFormatter

    with pytest.raises(NotImplementedError):
        PlainTextLogFormatter().format(_sample_record())


def test_formatter_utf8_and_nested_metadata() -> None:
    metadata = {"patient": {"name": "José"}, "tags": ["α", "β"]}
    record = _sample_record(metadata=metadata)
    payload = json.loads(JSONLogFormatter(pretty=False).format(record))
    assert payload["metadata"]["patient"]["name"] == "José"
    assert payload["metadata"]["tags"] == ["α", "β"]

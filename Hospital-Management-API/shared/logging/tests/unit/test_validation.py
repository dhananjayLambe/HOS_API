"""Unit tests for shared.logging.validation."""

import pytest

from shared.logging.constants import EventType, LogModule
from shared.logging.exceptions import LoggingError
from shared.logging.validation import (
    validate_action,
    validate_audit_event,
    validate_audit_type,
    validate_duration_ms,
    validate_event_code,
    validate_message,
    validate_metadata,
    validate_module,
)


def test_validate_message_accepts_non_empty_string() -> None:
    assert validate_message("  hello  ") == "hello"


@pytest.mark.parametrize("value", ["", "   ", 123, None])
def test_validate_message_rejects_invalid(value: object) -> None:
    with pytest.raises(LoggingError):
        validate_message(value)


def test_validate_module_accepts_enum() -> None:
    assert validate_module(LogModule.API) == LogModule.API


def test_validate_module_rejects_string() -> None:
    with pytest.raises(LoggingError):
        validate_module("not_a_valid_module")


@pytest.mark.parametrize("action", ["consultation.started", "booking.submitted"])
def test_validate_action_accepts_dot_notation(action: str) -> None:
    assert validate_action(action) == action


@pytest.mark.parametrize("action", ["CreateBooking", "UPPER.case", "", "no-dots"])
def test_validate_action_rejects_invalid(action: object) -> None:
    with pytest.raises(LoggingError):
        validate_action(action)


def test_validate_metadata_accepts_dict() -> None:
    assert validate_metadata({"key": "value"}) == {"key": "value"}


def test_validate_metadata_none_returns_empty_dict() -> None:
    assert validate_metadata(None) == {}


@pytest.mark.parametrize("value", [[], "string", 42])
def test_validate_metadata_rejects_non_dict(value: object) -> None:
    with pytest.raises(LoggingError):
        validate_metadata(value)


def test_validate_metadata_rejects_unsupported_nested_type() -> None:
    with pytest.raises(LoggingError):
        validate_metadata({"key": object()})


def test_validate_event_code_accepts_valid() -> None:
    assert validate_event_code("DP1001") == "DP1001"


def test_validate_event_code_none_returns_none() -> None:
    assert validate_event_code(None) is None


def test_validate_event_code_rejects_invalid() -> None:
    with pytest.raises(LoggingError):
        validate_event_code("INVALID")


def test_validate_duration_ms_accepts_non_negative() -> None:
    assert validate_duration_ms(42) == 42.0
    assert validate_duration_ms(0) == 0.0


def test_validate_duration_ms_rejects_negative() -> None:
    with pytest.raises(LoggingError):
        validate_duration_ms(-1)


def test_validate_audit_event_delegates_to_action_rules() -> None:
    assert validate_audit_event("consultation.completed") == "consultation.completed"


def test_validate_audit_type_accepts_enum() -> None:
    assert validate_audit_type(EventType.CLINICAL_AUDIT) == EventType.CLINICAL_AUDIT


def test_validate_audit_type_rejects_string() -> None:
    with pytest.raises(LoggingError):
        validate_audit_type("not_a_valid_audit_type")


def test_validate_action_rejects_non_string() -> None:
    with pytest.raises(LoggingError):
        validate_action(123)  # type: ignore[arg-type]


def test_validate_event_code_rejects_non_string() -> None:
    with pytest.raises(LoggingError):
        validate_event_code(1001)  # type: ignore[arg-type]


def test_validate_metadata_rejects_non_string_keys() -> None:
    with pytest.raises(LoggingError):
        validate_metadata({1: "value"})  # type: ignore[arg-type]


def test_validate_duration_ms_rejects_non_number() -> None:
    with pytest.raises(LoggingError):
        validate_duration_ms("fast")  # type: ignore[arg-type]

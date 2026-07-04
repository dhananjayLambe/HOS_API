"""Unit tests for shared.logging.context_serializer."""

from __future__ import annotations

from uuid import uuid4

import pytest

from shared.logging.context import LogContext
from shared.logging.context_serializer import (
    deserialize_log_context,
    is_empty_log_context,
    serialize_log_context,
)


def test_is_empty_log_context_for_default() -> None:
    assert is_empty_log_context(LogContext()) is True


def test_is_empty_log_context_false_when_field_set() -> None:
    assert is_empty_log_context(LogContext(correlation_id="abc")) is False


def test_serialize_omits_none_fields() -> None:
    context = LogContext(correlation_id="corr-1", booking_id="BK1")
    payload = serialize_log_context(context)

    assert payload == {"correlation_id": "corr-1", "booking_id": "BK1"}
    assert "request_id" not in payload


def test_round_trip_preserves_all_fields() -> None:
    correlation_id = str(uuid4())
    original = LogContext(
        correlation_id=correlation_id,
        request_id=str(uuid4()),
        user_id="user-1",
        user_role="doctor",
        patient_account_id="pa-1",
        patient_profile_id="pp-1",
        consultation_id="cons-1",
        encounter_id="enc-1",
        recommendation_id="rec-1",
        booking_id="BK1",
        laboratory_id="lab-1",
        report_id="rep-1",
        whatsapp_message_id="wa-1",
    )

    restored = deserialize_log_context(serialize_log_context(original))

    assert restored == original


def test_deserialize_empty_dict_returns_empty_context() -> None:
    assert deserialize_log_context({}) == LogContext()


@pytest.mark.parametrize("payload", [None, "string", 123, []])
def test_deserialize_invalid_payload_returns_empty_context(payload: object) -> None:
    assert deserialize_log_context(payload) == LogContext()


def test_deserialize_invalid_correlation_id_returns_empty_context() -> None:
    payload = {"correlation_id": "not-a-uuid", "booking_id": "BK1"}
    assert deserialize_log_context(payload) == LogContext()


def test_deserialize_normalizes_correlation_id() -> None:
    correlation_id = str(uuid4())
    restored = deserialize_log_context({"correlation_id": correlation_id.upper()})
    assert restored.correlation_id == correlation_id

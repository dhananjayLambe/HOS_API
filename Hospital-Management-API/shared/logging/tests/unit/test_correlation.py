"""Unit tests for shared.logging.correlation."""

from __future__ import annotations

from dataclasses import FrozenInstanceError
from uuid import UUID, uuid1, uuid4

import pytest

from shared.logging.constants import CORRELATION_ID_LENGTH, CORRELATION_ID_VERSION
from shared.logging.correlation import (
    CorrelationId,
    generate_correlation_id,
    is_valid_correlation_id,
    parse_correlation_id,
)
from shared.logging.exceptions import LoggingError


def test_generate_returns_uuid_v4() -> None:
    correlation_id = CorrelationId.generate()

    assert correlation_id._uuid.version == CORRELATION_ID_VERSION
    assert len(correlation_id.to_string()) == CORRELATION_ID_LENGTH


def test_generate_produces_unique_values() -> None:
    first = CorrelationId.generate()
    second = CorrelationId.generate()

    assert first != second


def test_from_uuid_accepts_uuid_v4() -> None:
    uuid_value = uuid4()
    correlation_id = CorrelationId.from_uuid(uuid_value)

    assert correlation_id._uuid == uuid_value


def test_from_uuid_rejects_non_v4() -> None:
    with pytest.raises(LoggingError, match="UUID version"):
        CorrelationId.from_uuid(uuid1())


def test_parse_accepts_canonical_string() -> None:
    uuid_value = uuid4()
    correlation_id = CorrelationId.parse(str(uuid_value))

    assert correlation_id.to_string() == str(uuid_value)


def test_parse_accepts_uppercase_string() -> None:
    uuid_value = uuid4()
    upper = str(uuid_value).upper()

    parsed = CorrelationId.parse(upper)
    canonical = CorrelationId.parse(str(uuid_value))

    assert parsed == canonical


def test_parse_strips_surrounding_whitespace() -> None:
    uuid_value = uuid4()
    correlation_id = CorrelationId.parse(f"  {uuid_value}  ")

    assert correlation_id.to_string() == str(uuid_value)


@pytest.mark.parametrize("value", [None, 123, "", "   ", "not-a-uuid", "1234"])
def test_validate_rejects_invalid_values(value: object) -> None:
    with pytest.raises(LoggingError):
        CorrelationId.validate(value)


def test_validate_rejects_uuid_v1_string() -> None:
    with pytest.raises(LoggingError, match="UUID version"):
        CorrelationId.validate(str(uuid1()))


def test_is_valid_correlation_id_returns_false_for_invalid() -> None:
    assert is_valid_correlation_id(None) is False
    assert is_valid_correlation_id("") is False
    assert is_valid_correlation_id("bad-value") is False
    assert is_valid_correlation_id(str(uuid1())) is False


def test_is_valid_correlation_id_returns_true_for_valid() -> None:
    assert is_valid_correlation_id(str(uuid4())) is True


def test_round_trip_serialization_preserves_identity() -> None:
    original = CorrelationId.generate()
    restored = CorrelationId.parse(original.to_string())

    assert restored == original
    assert restored.to_string() == original.to_string()


def test_equality_compares_underlying_uuid_not_string_format() -> None:
    uuid_value = uuid4()
    lower = CorrelationId.parse(str(uuid_value))
    upper = CorrelationId.parse(str(uuid_value).upper())

    assert lower == upper


def test_inequality_for_different_uuids() -> None:
    assert CorrelationId.generate() != CorrelationId.generate()


def test_hashable_in_sets() -> None:
    correlation_id = CorrelationId.generate()
    parsed = CorrelationId.parse(correlation_id.to_string())

    assert {correlation_id, parsed} == {correlation_id}


def test_str_and_repr_use_canonical_string() -> None:
    correlation_id = CorrelationId.generate()
    canonical = correlation_id.to_string()

    assert str(correlation_id) == canonical
    assert repr(correlation_id) == f"CorrelationId({canonical!r})"


def test_immutability() -> None:
    correlation_id = CorrelationId.generate()

    with pytest.raises(FrozenInstanceError):
        correlation_id._uuid = uuid4()  # type: ignore[misc]


def test_module_helpers_delegate_to_class() -> None:
    generated = generate_correlation_id()
    assert isinstance(generated, CorrelationId)

    value = str(uuid4())
    assert parse_correlation_id(value) == CorrelationId.parse(value)


def test_eq_returns_not_implemented_for_non_correlation_id() -> None:
    correlation_id = CorrelationId.generate()

    assert correlation_id.__eq__("not-a-correlation-id") is NotImplemented


def test_from_uuid_rejects_nil_uuid() -> None:
    with pytest.raises(LoggingError, match="UUID version"):
        CorrelationId.from_uuid(UUID(int=0))

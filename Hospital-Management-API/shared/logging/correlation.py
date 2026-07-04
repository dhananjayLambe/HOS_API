"""Correlation ID domain model for the DoctorProCare logging platform.

Purpose:
    Define the immutable Correlation ID value object used for end-to-end workflow
    tracing across HTTP requests, Celery tasks, and future services.

Responsibility:
    Generate, validate, parse, and serialize UUID v4 Correlation IDs only.
    No runtime context, middleware, or logger integration in this module.

Future implementation:
    Consumed by the Request Context Framework (M2.2), Django middleware (M2.3),
    and logger auto-injection (M2.4).
"""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID, uuid4

from shared.logging.constants import CORRELATION_ID_VERSION
from shared.logging.exceptions import LoggingError


def _parse_uuid_v4(value: str) -> UUID:
    """Parse and validate a UUID v4 string.

    Args:
        value: Canonical or case-variant hyphenated UUID string.

    Returns:
        UUID: Parsed UUID instance.

    Raises:
        LoggingError: If the value is not a valid UUID v4.
    """
    try:
        parsed = UUID(value)
    except (AttributeError, TypeError, ValueError) as exc:
        raise LoggingError("correlation_id must be a valid UUID v4 string") from exc

    if parsed.version != CORRELATION_ID_VERSION:
        raise LoggingError(
            f"correlation_id must be UUID version {CORRELATION_ID_VERSION}"
        )

    return parsed


@dataclass(frozen=True, slots=True)
class CorrelationId:
    """Immutable Correlation ID wrapping a UUID v4 value."""

    _uuid: UUID

    @classmethod
    def generate(cls) -> CorrelationId:
        """Create a new randomly generated Correlation ID."""
        return cls.from_uuid(uuid4())

    @classmethod
    def parse(cls, value: str) -> CorrelationId:
        """Parse a string into a Correlation ID.

        Args:
            value: Hyphenated UUID v4 string.

        Returns:
            CorrelationId: Validated value object.

        Raises:
            LoggingError: If validation fails.
        """
        cls.validate(value)
        return cls(_uuid=_parse_uuid_v4(value.strip()))

    @classmethod
    def from_uuid(cls, uuid_value: UUID) -> CorrelationId:
        """Construct a Correlation ID from a UUID instance.

        Args:
            uuid_value: UUID v4 instance.

        Returns:
            CorrelationId: Validated value object.

        Raises:
            LoggingError: If the UUID is not version 4.
        """
        if uuid_value.version != CORRELATION_ID_VERSION:
            raise LoggingError(
                f"correlation_id must be UUID version {CORRELATION_ID_VERSION}"
            )
        return cls(_uuid=uuid_value)

    @classmethod
    def validate(cls, value: object) -> None:
        """Validate a candidate Correlation ID string.

        Args:
            value: Candidate correlation ID value.

        Raises:
            LoggingError: If the value is invalid.
        """
        if not isinstance(value, str):
            raise LoggingError("correlation_id must be a string")

        if not value.strip():
            raise LoggingError("correlation_id must not be empty")

        _parse_uuid_v4(value.strip())

    def to_string(self) -> str:
        """Return the canonical lowercase hyphenated string representation."""
        return str(self._uuid)

    def __str__(self) -> str:
        return self.to_string()

    def __repr__(self) -> str:
        return f"CorrelationId({self.to_string()!r})"

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, CorrelationId):
            return NotImplemented
        return self._uuid == other._uuid

    def __hash__(self) -> int:
        return hash(self._uuid)


def generate_correlation_id() -> CorrelationId:
    """Generate a new Correlation ID."""
    return CorrelationId.generate()


def is_valid_correlation_id(value: object) -> bool:
    """Return whether value is a valid Correlation ID string."""
    try:
        CorrelationId.validate(value)
    except LoggingError:
        return False
    return True


def parse_correlation_id(value: str) -> CorrelationId:
    """Parse a string into a Correlation ID."""
    return CorrelationId.parse(value)

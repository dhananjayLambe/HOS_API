"""Exception capture for the DoctorProCare logging platform.

Purpose:
    Collect structured exception diagnostics for logger.exception() calls.

Responsibility:
    Resolve exception type, message, and stack trace from exc or sys.exc_info().
    Reject reserved metadata keys that belong on LogRecord, not in metadata.
"""

from __future__ import annotations

import sys
import traceback
from dataclasses import dataclass
from typing import Any

from shared.logging.exceptions import LoggingError

_RESERVED_METADATA_KEYS = frozenset(
    {
        "stack_trace",
        "exception",
        "exception_type",
        "exception_message",
    }
)


@dataclass(frozen=True)
class ExceptionCapture:
    """Immutable exception diagnostics captured for a log record."""

    exception_type: str
    exception_message: str
    stack_trace: str


def validate_exception_metadata(metadata: dict[str, Any]) -> dict[str, Any]:
    """Reject metadata keys reserved for structured exception fields.

    Args:
        metadata: Caller-supplied business metadata.

    Returns:
        dict[str, Any]: The same metadata if valid.

    Raises:
        LoggingError: If metadata contains reserved exception keys.
    """
    for key in metadata:
        if key in _RESERVED_METADATA_KEYS:
            raise LoggingError(
                f"metadata must not contain reserved key: {key}"
            )
    return metadata


def capture_exception(*, exc: BaseException | None = None) -> ExceptionCapture:
    """Capture exception type, message, and stack trace.

    Args:
        exc: Optional explicit exception instance from the caller.

    Returns:
        ExceptionCapture: Structured exception diagnostics.

    Raises:
        LoggingError: If no exception is provided and none is active.
    """
    if exc is not None:
        exc_type = type(exc)
        exc_value = exc
        exc_tb = exc.__traceback__
    else:
        exc_info = sys.exc_info()
        if exc_info[0] is None:
            raise LoggingError("no active exception to log")
        exc_type, exc_value, exc_tb = exc_info

    assert exc_type is not None
    assert exc_value is not None

    stack_trace = "".join(traceback.format_exception(exc_type, exc_value, exc_tb))
    return ExceptionCapture(
        exception_type=exc_type.__name__,
        exception_message=str(exc_value),
        stack_trace=stack_trace,
    )

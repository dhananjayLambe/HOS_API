"""Input validation for the DoctorProCare logging platform.

Purpose:
    Validate all logging call arguments before record construction.

Responsibility:
    Enforce message, module, action, metadata, event code, and duration rules.
    Raise LoggingError for programming errors.

Future implementation:
    Additional validators for correlation IDs, actor IDs, and PII checks.
"""

from __future__ import annotations

import re
from typing import Any

from shared.logging.constants import EventType, LogModule
from shared.logging.exceptions import LoggingError

_ACTION_PATTERN = re.compile(r"^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$")
_EVENT_CODE_PATTERN = re.compile(r"^DP\d{4}$")

_JSON_SAFE_TYPES = (str, int, float, bool, type(None))


def validate_message(message: object) -> str:
    """Validate and return a non-empty log message.

    Args:
        message: Value provided as the log message.

    Returns:
        str: Stripped, validated message.

    Raises:
        LoggingError: If message is missing, not a string, or empty after strip.
    """
    if not isinstance(message, str):
        raise LoggingError("message must be a string")
    stripped = message.strip()
    if not stripped:
        raise LoggingError("message must not be empty")
    return stripped


def validate_module(module: object) -> LogModule:
    """Validate that module is an approved LogModule enum value.

    Args:
        module: Value provided as the log module.

    Returns:
        LogModule: Validated module enum.

    Raises:
        LoggingError: If module is not a LogModule instance.
    """
    if not isinstance(module, LogModule):
        raise LoggingError("module must be a LogModule enum value")
    return module


def validate_action(action: object) -> str:
    """Validate and return a dot-notation action name.

    Args:
        action: Value provided as the action name.

    Returns:
        str: Validated action string.

    Raises:
        LoggingError: If action is invalid.
    """
    if not isinstance(action, str):
        raise LoggingError("action must be a string")
    if not _ACTION_PATTERN.match(action):
        raise LoggingError(
            "action must use lowercase dot notation (e.g. consultation.started)"
        )
    return action


def validate_audit_event(event: object) -> str:
    """Validate an audit event name using the same rules as action names.

    Args:
        event: Value provided as the audit event name.

    Returns:
        str: Validated event string.

    Raises:
        LoggingError: If event is invalid.
    """
    return validate_action(event)


def validate_metadata(metadata: object) -> dict[str, Any]:
    """Validate and return a metadata dictionary with JSON-safe values.

    Args:
        metadata: Optional metadata dict from the caller.

    Returns:
        dict[str, Any]: Validated metadata (empty dict if None).

    Raises:
        LoggingError: If metadata is not a dict or contains unsupported types.
    """
    if metadata is None:
        return {}
    if not isinstance(metadata, dict):
        raise LoggingError("metadata must be a dictionary")
    _validate_json_safe_value(metadata, path="metadata")
    return metadata


def validate_event_code(event_code: object) -> str | None:
    """Validate an optional event code.

    Args:
        event_code: Optional machine-readable event code.

    Returns:
        str | None: Validated event code, or None if not provided.

    Raises:
        LoggingError: If event_code is provided but invalid.
    """
    if event_code is None:
        return None
    if not isinstance(event_code, str):
        raise LoggingError("event_code must be a string")
    if not _EVENT_CODE_PATTERN.match(event_code):
        raise LoggingError("event_code must match pattern DP#### (e.g. DP1001)")
    return event_code


def validate_duration_ms(duration_ms: object) -> float:
    """Validate a performance duration in milliseconds.

    Args:
        duration_ms: Duration value from the caller.

    Returns:
        float: Validated duration.

    Raises:
        LoggingError: If duration is not a non-negative number.
    """
    if not isinstance(duration_ms, (int, float)):
        raise LoggingError("duration_ms must be a number")
    if duration_ms < 0:
        raise LoggingError("duration_ms must be non-negative")
    return float(duration_ms)


def validate_audit_type(audit_type: object) -> EventType:
    """Validate that audit_type is an EventType enum value.

    Args:
        audit_type: Value provided as the audit type.

    Returns:
        EventType: Validated audit type enum.

    Raises:
        LoggingError: If audit_type is not an EventType instance.
    """
    if not isinstance(audit_type, EventType):
        raise LoggingError("audit_type must be an EventType enum value")
    return audit_type


def _validate_json_safe_value(value: object, *, path: str) -> None:
    """Recursively validate that a value contains only JSON-safe types."""
    if isinstance(value, _JSON_SAFE_TYPES):
        return
    if isinstance(value, list):
        for index, item in enumerate(value):
            _validate_json_safe_value(item, path=f"{path}[{index}]")
        return
    if isinstance(value, dict):
        for key, item in value.items():
            if not isinstance(key, str):
                raise LoggingError(f"{path} keys must be strings")
            _validate_json_safe_value(item, path=f"{path}.{key}")
        return
    raise LoggingError(f"{path} contains unsupported type: {type(value).__name__}")

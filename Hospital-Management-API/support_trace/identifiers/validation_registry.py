"""Aggregates strategy validation."""

from __future__ import annotations

from shared.logging import LogModule, logger
from support_trace.identifiers.identifier_registry import IdentifierRegistry
from support_trace.identifiers.lookup_keys import IDENTIFIER_FIELDS


class ValidationRegistry:
    @classmethod
    def validate_dict(cls, identifiers: dict[str, str]) -> dict[str, str]:
        validated: dict[str, str] = {}
        seen: dict[str, str] = {}
        for field, value in identifiers.items():
            if field not in IDENTIFIER_FIELDS or not value:
                continue
            strategy = IdentifierRegistry.get_by_field(field)
            if strategy is None:
                validated[field] = value
                continue
            error = strategy.validate(value)
            if error:
                logger.warning(
                    "Identifier validation failed",
                    module=LogModule.MONITORING,
                    action="support_trace.identifier.validation_failed",
                    metadata={"field": field, "error": error},
                )
                continue
            if field in seen and seen[field] != value:
                logger.warning(
                    "Identifier duplicate conflict",
                    module=LogModule.MONITORING,
                    action="support_trace.identifier.duplicate_conflict",
                    metadata={"field": field, "existing": seen[field], "new": value},
                )
                continue
            seen[field] = value
            validated[field] = value
        return validated

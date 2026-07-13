"""Identifier field registry and normalization for Support Trace (shim)."""

from support_trace.identifiers.lookup_keys import (  # noqa: F401
    IDENTIFIER_FIELDS,
    _LOG_CONTEXT_IDENTIFIER_MAP,
    build_search_vector,
    merge_identifiers,
    normalize_phone,
    normalize_provider_reference,
    normalize_uuid,
)


def normalize_identifier_value(field: str, value) -> str | None:
    from support_trace.identifiers.normalization_registry import NormalizationRegistry

    return NormalizationRegistry.normalize(field, value)

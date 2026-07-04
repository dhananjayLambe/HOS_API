"""Unit tests for shared.logging.context_enricher."""

from __future__ import annotations

from dataclasses import FrozenInstanceError

import pytest

from shared.logging.context import LogContext
from shared.logging.context_enricher import (
    ContextEnrichment,
    DefaultContextEnricher,
    validate_framework_metadata,
)
from shared.logging.exceptions import LoggingError


class _StubContextProvider:
    def __init__(self, context: LogContext) -> None:
        self._context = context

    def get(self) -> LogContext:
        return self._context


def test_from_log_context_copies_all_fields() -> None:
    context = LogContext(
        correlation_id="corr-1",
        request_id="req-1",
        booking_id="BK123",
        consultation_id="CONS456",
    )
    enrichment = ContextEnrichment.from_log_context(context)

    assert enrichment.correlation_id == "corr-1"
    assert enrichment.request_id == "req-1"
    assert enrichment.booking_id == "BK123"
    assert enrichment.consultation_id == "CONS456"
    assert enrichment.user_id is None


def test_default_enricher_returns_empty_when_no_context() -> None:
    enricher = DefaultContextEnricher(context_provider=_StubContextProvider(LogContext()))
    enrichment = enricher.enrich()

    assert enrichment == ContextEnrichment.empty()


def test_default_enricher_reads_active_context() -> None:
    context = LogContext(correlation_id="abc", request_id="def")
    enricher = DefaultContextEnricher(context_provider=_StubContextProvider(context))

    assert enricher.enrich().correlation_id == "abc"
    assert enricher.enrich().request_id == "def"


def test_context_enrichment_is_immutable() -> None:
    enrichment = ContextEnrichment(correlation_id="abc")

    with pytest.raises(FrozenInstanceError):
        enrichment.correlation_id = "changed"  # type: ignore[misc]


@pytest.mark.parametrize("key", ["correlation_id", "request_id", "booking_id"])
def test_validate_framework_metadata_rejects_reserved_keys(key: str) -> None:
    with pytest.raises(LoggingError, match="reserved key"):
        validate_framework_metadata({key: "value"})


def test_validate_framework_metadata_accepts_business_keys() -> None:
    metadata = {"laboratory": "ABC Diagnostics"}
    assert validate_framework_metadata(metadata) == metadata

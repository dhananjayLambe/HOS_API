"""Unit tests for shared.logging.record."""

from dataclasses import FrozenInstanceError

import pytest

from shared.logging.constants import (
    SCHEMA_VERSION,
    LogLevel,
    LogModule,
    LogStatus,
)
from shared.logging.record import LogRecord, build_record, enrich_record
from shared.logging.context_enricher import ContextEnrichment


def test_log_record_is_frozen() -> None:
    record = build_record(
        level=LogLevel.INFO,
        module=LogModule.API,
        action="api.request",
        message="test",
        status=LogStatus.SUCCESS,
    )
    with pytest.raises(FrozenInstanceError):
        record.message = "changed"  # type: ignore[misc]


def test_schema_version_is_one() -> None:
    record = build_record(
        level=LogLevel.INFO,
        module=LogModule.API,
        action="api.request",
        message="test",
        status=LogStatus.SUCCESS,
    )
    assert record.schema_version == SCHEMA_VERSION
    assert record.schema_version == 1


def test_build_record_deep_copies_metadata() -> None:
    metadata = {"key": "value"}
    record = build_record(
        level=LogLevel.INFO,
        module=LogModule.API,
        action="api.request",
        message="test",
        status=LogStatus.SUCCESS,
        metadata=metadata,
    )
    metadata["key"] = "mutated"
    assert record.metadata["key"] == "value"


def test_build_record_sets_utc_timestamp() -> None:
    record = build_record(
        level=LogLevel.INFO,
        module=LogModule.API,
        action="api.request",
        message="test",
        status=LogStatus.SUCCESS,
    )
    assert record.timestamp.tzinfo is not None


def test_build_record_accepts_explicit_timestamp() -> None:
    from datetime import datetime, timezone

    ts = datetime(2025, 1, 1, tzinfo=timezone.utc)
    record = build_record(
        level=LogLevel.INFO,
        module=LogModule.API,
        action="api.request",
        message="test",
        status=LogStatus.SUCCESS,
        timestamp=ts,
    )
    assert record.timestamp == ts


def test_enrich_record_applies_context_fields() -> None:
    record = build_record(
        level=LogLevel.INFO,
        module=LogModule.API,
        action="api.request",
        message="test",
        status=LogStatus.SUCCESS,
    )
    enrichment = ContextEnrichment(
        correlation_id="corr-1",
        request_id="req-1",
        booking_id="BK123",
    )
    enriched = enrich_record(record, enrichment)

    assert enriched.correlation_id == "corr-1"
    assert enriched.request_id == "req-1"
    assert enriched.booking_id == "BK123"
    assert enriched is not record


def test_enrich_record_skips_none_fields() -> None:
    record = build_record(
        level=LogLevel.INFO,
        module=LogModule.API,
        action="api.request",
        message="test",
        status=LogStatus.SUCCESS,
    )
    enriched = enrich_record(record, ContextEnrichment.empty())

    assert enriched is record


def test_enrich_record_preserves_immutability() -> None:
    record = build_record(
        level=LogLevel.INFO,
        module=LogModule.API,
        action="api.request",
        message="test",
        status=LogStatus.SUCCESS,
    )
    enriched = enrich_record(
        record,
        ContextEnrichment(correlation_id="corr-1"),
    )

    with pytest.raises(FrozenInstanceError):
        enriched.correlation_id = "changed"  # type: ignore[misc]

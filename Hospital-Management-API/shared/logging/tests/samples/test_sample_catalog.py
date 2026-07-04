"""Validate reference sample log catalog."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import pytest

from shared.logging.constants import EventType, LogLevel, LogModule, LogStatus
from shared.logging.context_enricher import ContextEnrichment
from shared.logging.formatter import JSONLogFormatter, SCHEMA_FIELDS
from shared.logging.record import build_record, enrich_record

SAMPLES_DIR = Path(__file__).parent
REFERENCE_TS = datetime(2026, 7, 1, 12, 0, 0, 123456, tzinfo=timezone.utc)
FORMATTER = JSONLogFormatter(pretty=False)


def _build_samples() -> dict[str, str]:
    records = {
        "info.json": build_record(
            level=LogLevel.INFO,
            module=LogModule.CONSULTATION,
            action="consultation.started",
            message="Consultation started",
            status=LogStatus.SUCCESS,
            timestamp=REFERENCE_TS,
        ),
        "warning.json": build_record(
            level=LogLevel.WARNING,
            module=LogModule.BOOKING,
            action="booking.retry",
            message="Booking retry scheduled",
            status=LogStatus.RETRIED,
            timestamp=REFERENCE_TS,
        ),
        "error.json": build_record(
            level=LogLevel.ERROR,
            module=LogModule.API,
            action="api.failed",
            message="API request failed",
            status=LogStatus.FAILED,
            event_code="DP1001",
            timestamp=REFERENCE_TS,
        ),
        "exception.json": enrich_record(
            build_record(
                level=LogLevel.ERROR,
                module=LogModule.BOOKING,
                action="booking.create",
                message="Failed to create booking",
                status=LogStatus.FAILED,
                event_code="DP1002",
                duration_ms=842.7,
                exception_type="IntegrityError",
                exception_message="duplicate key",
                stack_trace=(
                    "Traceback (most recent call last):\n"
                    '  File "app.py", line 1\n'
                    "IntegrityError: duplicate key\n"
                ),
                timestamp=REFERENCE_TS,
            ),
            ContextEnrichment(booking_id="BK123"),
        ),
        "audit.json": enrich_record(
            build_record(
                level=LogLevel.INFO,
                module=None,
                action="booking.submitted",
                message="Audit event: booking.submitted",
                status=LogStatus.SUCCESS,
                audit_type=EventType.BUSINESS_AUDIT,
                timestamp=REFERENCE_TS,
            ),
            ContextEnrichment(booking_id="BK123"),
        ),
        "performance.json": build_record(
            level=LogLevel.INFO,
            module=None,
            action="booking.submitted",
            message="booking.submitted completed in 120.5ms",
            status=LogStatus.SUCCESS,
            duration_ms=120.5,
            metadata={"event_type": EventType.PERFORMANCE},
            timestamp=REFERENCE_TS,
        ),
    }
    return {name: FORMATTER.format(record) for name, record in records.items()}


@pytest.mark.parametrize("filename", list(_build_samples().keys()))
def test_sample_file_is_valid_json(filename: str) -> None:
    content = (SAMPLES_DIR / filename).read_text(encoding="utf-8").strip()
    payload = json.loads(content)
    assert isinstance(payload, dict)
    for field in SCHEMA_FIELDS:
        assert field in payload


def test_sample_files_match_generated_reference() -> None:
    for filename, expected in _build_samples().items():
        actual = (SAMPLES_DIR / filename).read_text(encoding="utf-8").strip()
        assert actual == expected.strip()


def test_exception_sample_has_nested_exception_object() -> None:
    payload = json.loads((SAMPLES_DIR / "exception.json").read_text(encoding="utf-8"))
    assert "exception" in payload
    assert payload["exception"]["type"] == "IntegrityError"
    assert payload["duration_ms"] == 842.7

"""Validate golden Correlation Framework sample traces."""

from __future__ import annotations

import json
from pathlib import Path

GOLDEN_DIR = (
    Path(__file__).resolve().parents[4]
    / "shared_docs"
    / "architecture"
    / "production_logging"
    / "samples"
)
GOLDEN_CORRELATION_ID = "550e8400-e29b-41d4-a716-446655440000"
GOLDEN_REQUEST_ID = "7f8a9b0c-1234-4abc-9def-0123456789ab"


def _load(name: str) -> dict:
    return json.loads((GOLDEN_DIR / name).read_text())


def test_patient_booking_trace_is_single_correlation() -> None:
    payload = _load("patient_booking_trace.json")
    assert payload["correlation_id"] == GOLDEN_CORRELATION_ID
    assert payload["request_id"] == GOLDEN_REQUEST_ID
    events = payload["events"]
    assert len(events) == 13
    assert all(event["correlation_id"] == GOLDEN_CORRELATION_ID for event in events)
    assert all(event["request_id"] == GOLDEN_REQUEST_ID for event in events)
    assert payload["timeline"][0]["action"] == "api.request_received"
    assert payload["timeline"][-1]["action"] == "workflow.completed"


def test_celery_and_report_traces_share_golden_correlation() -> None:
    celery = _load("celery_trace.json")
    report = _load("report_upload_trace.json")
    assert celery["correlation_id"] == GOLDEN_CORRELATION_ID
    assert report["correlation_id"] == GOLDEN_CORRELATION_ID
    assert all(
        event["correlation_id"] == GOLDEN_CORRELATION_ID for event in celery["events"]
    )
    assert all(
        event["correlation_id"] == GOLDEN_CORRELATION_ID for event in report["events"]
    )

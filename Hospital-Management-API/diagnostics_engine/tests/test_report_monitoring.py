"""Tests for structured report monitoring events."""

from __future__ import annotations

from unittest.mock import patch

from django.test import TestCase

from diagnostics_engine.monitoring.report_events import (
    EVENT_VERSION,
    OUTCOME_SUCCESS,
    emit_report_event,
    emit_report_metric,
    safe_emit,
)
from diagnostics_engine.monitoring.request_context import get_request_id, resolve_request_id


class ReportMonitoringTests(TestCase):
    def test_resolve_request_id_sets_context(self):
        rid = resolve_request_id("test-correlation-id")
        self.assertEqual(get_request_id(), rid)

    @patch("diagnostics_engine.monitoring.report_events.logger")
    def test_emit_report_event_includes_version_and_outcome(self, mock_logger):
        emit_report_event(
            "report_upload_completed",
            outcome=OUTCOME_SUCCESS,
            report_id="00000000-0000-0000-0000-000000000001",
            duration_ms=42,
        )
        mock_logger.info.assert_called()
        payload = mock_logger.info.call_args[0][1]
        self.assertIn(f'"event_version": {EVENT_VERSION}', payload)
        self.assertIn('"outcome": "SUCCESS"', payload)
        self.assertIn('"duration_ms": 42', payload)

    def test_safe_emit_swallows_exceptions(self):
        def boom():
            raise RuntimeError("monitoring down")

        safe_emit(boom)  # must not raise

    @patch("diagnostics_engine.monitoring.report_events.logger")
    def test_emit_metric_non_blocking(self, mock_logger):
        emit_report_metric("report_upload", value=1, tags={"branch": "x"})
        mock_logger.info.assert_called()

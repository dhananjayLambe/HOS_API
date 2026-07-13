"""Soft performance SLA tests."""

from __future__ import annotations

from django.test import TestCase

from support_trace.lookup import TraceLookupService
from support_trace.lookup.constants import PERFORMANCE_TARGETS_MS
from support_trace.tests.support import record_trace_event, setup_trace_context


class PerformanceTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_workflow_lookup_under_sla(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(clinic, wf_id, correlation_id=corr_id)
        result = TraceLookupService.lookup_by_workflow(wf_id)
        self.assertLess(result.duration_ms, PERFORMANCE_TARGETS_MS["workflow"] * 10)

    def test_correlation_lookup_under_sla(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(clinic, wf_id, correlation_id=corr_id)
        result = TraceLookupService.lookup_by_correlation(corr_id)
        self.assertLess(result.duration_ms, PERFORMANCE_TARGETS_MS["correlation"] * 10)

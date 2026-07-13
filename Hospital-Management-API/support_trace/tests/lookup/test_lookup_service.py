"""TraceLookupService public API tests."""

from __future__ import annotations

import uuid

from django.test import TestCase

from support_trace.lookup import InvestigationLevel, TraceLookupService
from support_trace.lookup.types import TraceLookupResult
from support_trace.tests.support import record_trace_event, setup_trace_context


class TraceLookupServiceTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_lookup_by_workflow_returns_result(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(clinic, wf_id, correlation_id=corr_id)
        result = TraceLookupService.lookup_by_workflow(wf_id)
        self.assertIsInstance(result, TraceLookupResult)
        self.assertIsNotNone(result.primary_trace)
        self.assertEqual(str(result.primary_trace.workflow_instance_id), wf_id)

    def test_lookup_by_correlation_returns_result(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(clinic, wf_id, correlation_id=corr_id)
        result = TraceLookupService.lookup_by_correlation(corr_id)
        self.assertGreaterEqual(result.identifier_lookup.trace_count, 1)
        self.assertTrue(result.scope.startswith("correlation:"))

    def test_investigate_alias(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(clinic, wf_id, correlation_id=corr_id)
        result = TraceLookupService.investigate(wf_id)
        self.assertIsInstance(result, TraceLookupResult)

    def test_lookup_many_dedupes(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(clinic, wf_id, correlation_id=corr_id)
        results = TraceLookupService.lookup_many(
            [corr_id, corr_id], parallel=True
        )
        self.assertEqual(len(results), 1)

    def test_basic_level_skips_timeline(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(clinic, wf_id, correlation_id=corr_id)
        result = TraceLookupService.lookup_by_workflow(
            wf_id, level=InvestigationLevel.BASIC
        )
        self.assertIsNone(result.timeline)
        self.assertIsNotNone(result.summary)

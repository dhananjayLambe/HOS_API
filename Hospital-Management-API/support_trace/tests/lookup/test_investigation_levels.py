"""Investigation level payload tests."""

from __future__ import annotations

from django.test import TestCase

from support_trace.lookup import InvestigationLevel, TraceLookupService
from support_trace.tests.support import record_trace_event, setup_trace_context


class InvestigationLevelTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_standard_includes_timeline_not_audits(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(clinic, wf_id, correlation_id=corr_id)
        result = TraceLookupService.lookup_by_workflow(
            wf_id, level=InvestigationLevel.STANDARD
        )
        self.assertIsNotNone(result.timeline)
        self.assertEqual(result.clinical_audits, ())
        self.assertEqual(result.business_audits, ())

    def test_full_includes_audits(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(clinic, wf_id, correlation_id=corr_id)
        result = TraceLookupService.lookup_by_workflow(
            wf_id, level=InvestigationLevel.FULL
        )
        self.assertIsNotNone(result.health)
        self.assertIsNotNone(result.statistics)

"""Workflow certification tests."""

from __future__ import annotations

from django.test import TestCase

from support_trace.certification.workflow_validator import WorkflowValidator
from support_trace.tests.support import record_trace_event, setup_trace_context


class WorkflowCertificationTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_validate_with_traces(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(clinic, wf_id, correlation_id=corr_id)
        warnings, score = WorkflowValidator.validate()
        self.assertGreater(score, 0.0)

    def test_validate_empty_db(self) -> None:
        from support_trace.models import SupportTrace

        SupportTrace.objects.all().delete()
        warnings, score = WorkflowValidator.validate()
        self.assertIn("no support traces indexed", warnings[0])

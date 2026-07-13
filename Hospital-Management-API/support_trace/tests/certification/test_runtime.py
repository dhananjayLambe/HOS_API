"""Runtime certification tests."""

from __future__ import annotations

from django.test import TestCase

from support_trace.certification.runtime_validator import RuntimeValidator
from support_trace.tests.support import record_trace_event, setup_trace_context


class RuntimeCertificationTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_validate_runtime_metadata(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(clinic, wf_id, correlation_id=corr_id)
        warnings, score = RuntimeValidator.validate(wf_id)
        self.assertGreaterEqual(score, 0.0)

    def test_validate_missing_workflow(self) -> None:
        warnings, score = RuntimeValidator.validate("missing-wf")
        self.assertIn("not found", warnings[0])

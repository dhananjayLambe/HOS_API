"""Runtime capture integration with SupportTraceService."""

from __future__ import annotations

from django.test import TestCase

from support_trace.models import SupportTrace
from support_trace.tests.support import record_trace_event, setup_trace_context


class RuntimeIntegrationTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_record_populates_runtime_metadata(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(clinic, wf_id, correlation_id=corr_id)
        trace = SupportTrace.objects.get(workflow_instance_id=wf_id)
        self.assertIsInstance(trace.runtime_metadata, dict)
        self.assertTrue(len(trace.runtime_metadata) > 0)

    def test_runtime_metadata_has_environment(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(clinic, wf_id, correlation_id=corr_id)
        trace = SupportTrace.objects.get(workflow_instance_id=wf_id)
        self.assertIn("environment", trace.runtime_metadata)

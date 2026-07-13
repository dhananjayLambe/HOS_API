"""Runtime repository tests."""

from __future__ import annotations

import uuid

from django.test import TestCase

from support_trace.domain.repository import SupportTraceRepository
from support_trace.models import SupportTrace
from support_trace.tests.support import record_trace_event, setup_trace_context


class RuntimeRepositoryTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_update_runtime(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(clinic, wf_id, correlation_id=corr_id)
        trace = SupportTrace.objects.get(workflow_instance_id=wf_id)
        repo = SupportTraceRepository()
        updated = repo.update_runtime(trace, {"request_id": "req-123", "environment": "test"})
        self.assertEqual(updated.runtime_metadata.get("request_id"), "req-123")

    def test_get_by_request_id(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(clinic, wf_id, correlation_id=corr_id)
        trace = SupportTrace.objects.get(workflow_instance_id=wf_id)
        SupportTraceRepository().update_runtime(trace, {"request_id": "req-find-me"})
        repo = SupportTraceRepository()
        traces = repo.get_by_request_id("req-find-me")
        self.assertGreaterEqual(len(traces), 1)

    def test_get_by_environment(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(clinic, wf_id, correlation_id=corr_id)
        trace = SupportTrace.objects.get(workflow_instance_id=wf_id)
        SupportTraceRepository().update_runtime(trace, {"environment": "cert-test-env"})
        found = SupportTraceRepository().get_by_environment("cert-test-env")
        self.assertGreaterEqual(len(found), 1)

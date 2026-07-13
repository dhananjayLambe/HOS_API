"""Runtime API expand=logs tests."""

from __future__ import annotations

from django.test import TestCase

from support_trace.domain.repository import SupportTraceRepository
from support_trace.models import SupportTrace
from support_trace.tests.api.support import support_api_client
from support_trace.tests.support import record_trace_event, setup_trace_context


class RuntimeApiTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_expand_logs_returns_runtime(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(clinic, wf_id, correlation_id=corr_id)
        trace = SupportTrace.objects.get(workflow_instance_id=wf_id)
        SupportTraceRepository().update_runtime(
            trace,
            {
                "request_id": "req-api-test",
                "cloudwatch_url": "https://us-east-1.console.aws.amazon.com/cloudwatch/",
                "deployment_version": "1.0.0",
            },
        )
        client, _ = support_api_client()
        response = client.get(f"/api/v1/support/workflow/{wf_id}?expand=logs")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertIn("runtime", response.data["data"])
        self.assertEqual(response.data["data"]["runtime"]["request_id"], "req-api-test")

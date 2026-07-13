"""Workflow and lookup API tests."""

from __future__ import annotations

from django.test import TestCase

from support_trace.tests.api.support import support_api_client
from support_trace.tests.support import record_trace_event, setup_trace_context


class WorkflowAPITests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_workflow_lookup(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(clinic, wf_id, correlation_id=corr_id)
        client, _ = support_api_client()
        response = client.get(f"/api/v1/support/workflow/{wf_id}", {"expand": "health,summary"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["primary_trace"]["workflow_instance_id"], wf_id)
        self.assertIn("health", response.data["data"])

    def test_workflow_not_found(self) -> None:
        client, _ = support_api_client()
        response = client.get("/api/v1/support/workflow/nonexistent-wf-id")
        self.assertEqual(response.status_code, 404)

    def test_correlation_lookup(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(clinic, wf_id, correlation_id=corr_id)
        client, _ = support_api_client()
        response = client.get(f"/api/v1/support/correlation/{corr_id}")
        self.assertEqual(response.status_code, 200)

    def test_anonymous_denied(self) -> None:
        from rest_framework.test import APIClient

        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(clinic, wf_id, correlation_id=corr_id)
        response = APIClient().get(f"/api/v1/support/workflow/{wf_id}")
        self.assertIn(response.status_code, (401, 403))

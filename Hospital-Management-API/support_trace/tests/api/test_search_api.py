"""Search API tests."""

from __future__ import annotations

import uuid

from django.test import TestCase

from support_trace.tests.api.support import support_api_client
from support_trace.tests.support import record_trace_event, setup_trace_context


class SearchAPITests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_search_requires_auth(self) -> None:
        from rest_framework.test import APIClient

        response = APIClient().get("/api/v1/support/search", {"q": "test"})
        self.assertIn(response.status_code, (401, 403))

    def test_search_by_provider_reference(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(
            clinic,
            wf_id,
            correlation_id=corr_id,
            identifiers={"provider_reference": "PROV-API-SEARCH-1"},
        )
        client, _ = support_api_client()
        response = client.get("/api/v1/support/search", {"q": "PROV-API-SEARCH-1"})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertIn("investigation_id", response.data["metadata"])

    def test_search_missing_q(self) -> None:
        client, _ = support_api_client()
        response = client.get("/api/v1/support/search")
        self.assertEqual(response.status_code, 400)

    def test_post_search(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(
            clinic,
            wf_id,
            correlation_id=corr_id,
            identifiers={"provider_reference": "PROV-API-POST-1"},
        )
        client, _ = support_api_client()
        response = client.post(
            "/api/v1/support/search",
            {"q": "PROV-API-POST-1", "expand": "summary"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("summary", response.data["data"])

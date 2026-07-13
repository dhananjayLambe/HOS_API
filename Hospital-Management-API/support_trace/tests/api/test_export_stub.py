"""Export and suggestions stub tests."""

from django.test import TestCase

from support_trace.tests.api.support import support_api_client


class StubAPITests(TestCase):
    def test_export_stub(self) -> None:
        client, _ = support_api_client()
        response = client.post("/api/v1/support/export", {}, format="json")
        self.assertEqual(response.status_code, 501)

    def test_suggestions_stub(self) -> None:
        client, _ = support_api_client()
        response = client.get("/api/v1/support/search/suggestions")
        self.assertEqual(response.status_code, 501)

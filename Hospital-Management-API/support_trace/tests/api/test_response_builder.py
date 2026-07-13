"""Response builder tests."""

from datetime import datetime, timezone

from django.test import SimpleTestCase
from unittest.mock import MagicMock

from support_trace.api.context import SupportInvestigationContext
from support_trace.api.response_builder import SupportResponseBuilder
from support_trace.lookup.investigation_policy import InvestigationPolicy
from support_trace.lookup.types import TraceLookupResult


class ResponseBuilderTests(SimpleTestCase):
    def test_envelope_includes_investigation_id(self) -> None:
        ctx = SupportInvestigationContext(
            user_id="1",
            role="admin",
            organization_id=None,
            permissions=frozenset({"admin"}),
            timezone="UTC",
            masking_policy=InvestigationPolicy.default(),
            request_id="req",
            client_ip=None,
            client=None,
            investigation_id="inv-abc",
        )
        result = TraceLookupResult(
            scope="workflow:x",
            generated_at=datetime.now(timezone.utc),
            duration_ms=5.0,
            primary_trace=MagicMock(workflow_instance_id="x", correlation_id="c1"),
        )
        request = MagicMock()
        request.META = {}
        response = SupportResponseBuilder.lookup_success(result, request=request, ctx=ctx)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["metadata"]["investigation_id"], "inv-abc")

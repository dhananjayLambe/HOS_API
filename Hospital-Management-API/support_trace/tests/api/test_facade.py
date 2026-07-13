"""Facade tests."""

from django.test import SimpleTestCase
from unittest.mock import MagicMock, patch

from support_trace.api.context import SupportInvestigationContext
from support_trace.api.contracts.investigation import InvestigationRequest
from support_trace.api.facade import SupportInvestigationFacade
from support_trace.lookup.investigation_policy import InvestigationPolicy


class FacadeTests(SimpleTestCase):
    def _ctx(self):
        return SupportInvestigationContext(
            user_id="1",
            role="helpdesk",
            organization_id=None,
            permissions=frozenset({"helpdesk"}),
            timezone="UTC",
            masking_policy=InvestigationPolicy.default(),
            request_id="req-1",
            client_ip="127.0.0.1",
            client="test",
            investigation_id="inv-1",
        )

    @patch("support_trace.api.facade.TraceLookupService.lookup_by_workflow")
    def test_lookup_by_workflow_delegates(self, mock_lookup) -> None:
        mock_lookup.return_value = MagicMock(scope="workflow:abc")
        req = InvestigationRequest()
        ctx = self._ctx()
        result = SupportInvestigationFacade.lookup_by_workflow("abc", req, ctx)
        mock_lookup.assert_called_once()
        self.assertEqual(result.scope, "workflow:abc")

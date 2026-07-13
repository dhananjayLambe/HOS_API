"""Investigation request parser tests."""

from django.test import RequestFactory, SimpleTestCase

from support_trace.api.investigation_request import InvestigationRequestParser
from support_trace.lookup.enums import InvestigationLevel


class InvestigationRequestTests(SimpleTestCase):
    def test_expand_maps_to_timeline(self) -> None:
        request = RequestFactory().get("/search", {"expand": "timeline,summary"})
        req = InvestigationRequestParser.from_get(request)
        self.assertIn("timeline", req.expand)
        self.assertTrue(req.options.include_timeline)
        self.assertTrue(req.options.include_summary)

    def test_level_basic(self) -> None:
        request = RequestFactory().get("/search", {"level": "basic", "q": "test"})
        req = InvestigationRequestParser.from_get(request)
        self.assertEqual(req.level, InvestigationLevel.BASIC)

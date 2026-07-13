"""Fail-open investigation hooks."""

from django.test import SimpleTestCase

from support_trace.lookup.hooks import fail_open_investigation
from support_trace.lookup.types import TraceLookupResult


class FailOpenTests(SimpleTestCase):
    def test_returns_default_on_exception(self) -> None:
        default = TraceLookupResult(scope="empty")

        def boom():
            raise RuntimeError("fail")

        result = fail_open_investigation("test", boom, default=default)
        self.assertEqual(result.scope, "empty")

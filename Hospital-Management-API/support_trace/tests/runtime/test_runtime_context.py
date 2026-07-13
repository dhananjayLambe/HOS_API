"""Runtime context builder tests."""

from __future__ import annotations

from django.test import SimpleTestCase

from support_trace.runtime.runtime_context import RuntimeContextBuilder
from support_trace.runtime.types import RuntimeContext


class RuntimeContextTests(SimpleTestCase):
    def test_build_minimal(self) -> None:
        ctx = RuntimeContextBuilder.build(request_id="r1", log_group="/g")
        self.assertEqual(ctx.request_id, "r1")
        self.assertEqual(ctx.log_group, "/g")

    def test_runtime_context_frozen(self) -> None:
        ctx = RuntimeContext(request_id="x")
        with self.assertRaises(AttributeError):
            ctx.request_id = "y"  # type: ignore[misc]

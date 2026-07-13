"""Runtime context resolver tests."""

from __future__ import annotations

from django.test import SimpleTestCase

from shared.logging.context import LogContext, get_context_manager
from support_trace.runtime.runtime_resolver import RuntimeResolver


class RuntimeResolverTests(SimpleTestCase):
    def tearDown(self) -> None:
        get_context_manager().clear()

    def test_resolve_from_log_context(self) -> None:
        get_context_manager().set(
            LogContext(correlation_id="corr-abc", request_id="req-xyz", environment="test")
        )
        ctx = RuntimeResolver.resolve()
        self.assertEqual(ctx.correlation_id, "corr-abc")
        self.assertEqual(ctx.request_id, "req-xyz")

    def test_resolve_includes_deployment(self) -> None:
        ctx = RuntimeResolver.resolve()
        self.assertIsNotNone(ctx.deployment_version)

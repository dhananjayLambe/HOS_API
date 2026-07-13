"""Logger integration tests."""

from __future__ import annotations

from django.test import SimpleTestCase

from support_trace.runtime.logger_integration import LoggerIntegration


class LoggerIntegrationTests(SimpleTestCase):
    def test_resolve_log_targets(self) -> None:
        targets = LoggerIntegration.resolve_log_targets()
        self.assertIn("log_group", targets)
        self.assertIn("log_region", targets)

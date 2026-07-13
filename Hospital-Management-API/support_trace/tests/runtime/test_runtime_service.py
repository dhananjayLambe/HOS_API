"""Runtime integration service tests."""

from __future__ import annotations

from django.test import SimpleTestCase

from support_trace.runtime.runtime_service import RuntimeIntegrationService
from support_trace.runtime.types import RuntimeContext


class RuntimeServiceTests(SimpleTestCase):
    def test_capture_runtime(self) -> None:
        ctx = RuntimeIntegrationService.capture_runtime()
        self.assertIsInstance(ctx, RuntimeContext)

    def test_build_metadata(self) -> None:
        ctx = RuntimeContext(request_id="r1", log_group="/g", log_region="us-east-1")
        meta = RuntimeIntegrationService.build_metadata(ctx)
        self.assertEqual(meta["request_id"], "r1")

    def test_build_cloudwatch_link(self) -> None:
        ctx = RuntimeContext(log_group="/aws/test", log_region="us-east-1")
        link = RuntimeIntegrationService.build_cloudwatch_link(ctx)
        self.assertIn("console.aws.amazon.com", link or "")

    def test_merge_runtime_for_record(self) -> None:
        merged = RuntimeIntegrationService.merge_runtime_for_record({})
        self.assertIsInstance(merged, dict)

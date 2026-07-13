"""Runtime builder and metadata tests."""

from __future__ import annotations

from django.test import SimpleTestCase

from support_trace.runtime.runtime_builder import RuntimeBuilder
from support_trace.runtime.types import RuntimeContext


class RuntimeBuilderTests(SimpleTestCase):
    def test_build_metadata(self) -> None:
        ctx = RuntimeContext(
            correlation_id="corr-1",
            request_id="req-1",
            log_group="/aws/test",
            log_region="us-east-1",
            deployment_version="1.2.3",
        )
        meta = RuntimeBuilder.build_metadata(ctx)
        self.assertEqual(meta["correlation_id"], "corr-1")
        self.assertEqual(meta["request_id"], "req-1")
        self.assertIn("cloudwatch_url", meta)

    def test_merge_metadata(self) -> None:
        merged = RuntimeBuilder.merge_metadata(
            {"request_id": "old"},
            {"request_id": "new", "environment": "test"},
        )
        self.assertEqual(merged["request_id"], "new")
        self.assertEqual(merged["environment"], "test")

    def test_merge_preserves_existing(self) -> None:
        merged = RuntimeBuilder.merge_metadata(
            {"celery_task_id": "task-1"},
            {"request_id": "req-1"},
        )
        self.assertEqual(merged["celery_task_id"], "task-1")

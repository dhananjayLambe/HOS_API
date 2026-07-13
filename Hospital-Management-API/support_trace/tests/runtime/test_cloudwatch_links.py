"""CloudWatch link builder tests."""

from __future__ import annotations

from django.test import SimpleTestCase

from support_trace.runtime.cloudwatch_links import CloudWatchLinkBuilder


class CloudWatchLinkTests(SimpleTestCase):
    def test_build_url_with_group(self) -> None:
        url = CloudWatchLinkBuilder.build_url(
            region="us-east-1",
            log_group="/aws/doctorprocare/api",
        )
        self.assertIn("console.aws.amazon.com", url or "")
        self.assertIn("us-east-1", url or "")

    def test_build_url_with_stream(self) -> None:
        url = CloudWatchLinkBuilder.build_url(
            region="eu-west-1",
            log_group="/aws/test",
            log_stream="api/host/2026-07-13",
        )
        self.assertIn("log-events", url or "")

    def test_build_url_with_request_id(self) -> None:
        url = CloudWatchLinkBuilder.build_url(
            region="us-east-1",
            log_group="/aws/test",
            request_id="req-abc-123",
        )
        self.assertIn("filterPattern", url or "")

    def test_missing_region_returns_none(self) -> None:
        self.assertIsNone(CloudWatchLinkBuilder.build_url(region="", log_group="/g"))

    def test_missing_group_returns_none(self) -> None:
        self.assertIsNone(CloudWatchLinkBuilder.build_url(region="us-east-1", log_group=""))

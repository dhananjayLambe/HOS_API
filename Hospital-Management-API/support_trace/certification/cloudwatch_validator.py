"""CloudWatch link certification validator."""

from __future__ import annotations

from support_trace.runtime.cloudwatch_links import CloudWatchLinkBuilder
from support_trace.runtime.types import RuntimeContext


class CloudWatchValidator:
    @classmethod
    def validate(cls) -> tuple[list[str], float]:
        warnings: list[str] = []
        url = CloudWatchLinkBuilder.build_url(
            region="us-east-1",
            log_group="/aws/doctorprocare/api",
            log_stream="api/host/2026-07-13",
            request_id="req-test-123",
        )
        if not url or "console.aws.amazon.com" not in url:
            warnings.append("cloudwatch url builder failed")
        ctx = RuntimeContext(
            log_region="us-east-1",
            log_group="/aws/test",
            request_id="abc",
        )
        from support_trace.runtime.runtime_service import RuntimeIntegrationService

        link = RuntimeIntegrationService.build_cloudwatch_link(ctx)
        if not link:
            warnings.append("runtime service cloudwatch link empty")
        score = 1.0 if not warnings else 0.5
        return warnings, score

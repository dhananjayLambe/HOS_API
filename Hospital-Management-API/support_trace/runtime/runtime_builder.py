"""Build runtime_metadata dict from RuntimeContext."""

from __future__ import annotations

from support_trace.runtime.cloudwatch_links import CloudWatchLinkBuilder
from support_trace.runtime.types import RuntimeContext, RuntimeMetadata


class RuntimeBuilder:
    @classmethod
    def build_metadata(cls, ctx: RuntimeContext) -> dict:
        cloudwatch_url = CloudWatchLinkBuilder.build_url(
            region=ctx.log_region or "us-east-1",
            log_group=ctx.log_group or "",
            log_stream=ctx.log_stream,
            timestamp=ctx.captured_at,
            request_id=ctx.request_id,
        )
        meta = RuntimeMetadata(
            correlation_id=ctx.correlation_id,
            request_id=ctx.request_id,
            log_group=ctx.log_group,
            log_stream=ctx.log_stream,
            log_region=ctx.log_region,
            cloudwatch_url=cloudwatch_url,
            lambda_request_id=ctx.lambda_request_id,
            celery_task_id=ctx.celery_task_id,
            celery_worker=ctx.celery_worker,
            celery_queue=ctx.celery_queue,
            deployment_version=ctx.deployment_version,
            git_commit=ctx.git_commit,
            release_version=ctx.release_version,
            hostname=ctx.hostname,
            environment=ctx.environment,
            availability_zone=ctx.availability_zone,
            aws_account=ctx.aws_account,
            container_id=ctx.container_id,
            pod_name=ctx.pod_name,
        )
        return meta.to_dict()

    @classmethod
    def merge_metadata(cls, existing: dict | None, new: dict) -> dict:
        base = dict(existing or {})
        for key, value in new.items():
            if value is not None:
                base[key] = value
        return base

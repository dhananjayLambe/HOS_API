"""Runtime integration service — public API for M5.8."""

from __future__ import annotations

from typing import Any

from shared.logging.context import LogContext
from support_trace.domain.repository import SupportTraceRepository
from support_trace.models import SupportTrace
from support_trace.runtime.cloudwatch_links import CloudWatchLinkBuilder
from support_trace.runtime.hooks import fail_open_runtime
from support_trace.runtime.runtime_builder import RuntimeBuilder
from support_trace.runtime.runtime_resolver import RuntimeResolver
from support_trace.runtime.types import RuntimeContext


class RuntimeIntegrationService:
    _repository = SupportTraceRepository()

    @classmethod
    def capture_runtime(cls, *, log_context: LogContext | None = None) -> RuntimeContext:
        return fail_open_runtime(
            "capture_runtime",
            lambda: RuntimeResolver.resolve(log_context=log_context),
            default=RuntimeContext(),
        )

    @classmethod
    def build_metadata(cls, ctx: RuntimeContext) -> dict:
        return RuntimeBuilder.build_metadata(ctx)

    @classmethod
    def build_cloudwatch_link(
        cls, ctx: RuntimeContext, *, timestamp=None
    ) -> str | None:
        if not ctx.log_group or not ctx.log_region:
            return None
        return CloudWatchLinkBuilder.build_url(
            region=ctx.log_region,
            log_group=ctx.log_group,
            log_stream=ctx.log_stream,
            timestamp=timestamp or ctx.captured_at,
            request_id=ctx.request_id,
        )

    @classmethod
    def resolve_logger_context(cls) -> RuntimeContext:
        return cls.capture_runtime()

    @classmethod
    def merge_runtime_for_record(
        cls,
        existing_metadata: dict | None,
        *,
        log_context: LogContext | None = None,
    ) -> dict:
        ctx = cls.capture_runtime(log_context=log_context)
        new_meta = cls.build_metadata(ctx)
        return RuntimeBuilder.merge_metadata(existing_metadata, new_meta)

    @classmethod
    def update_trace_runtime(
        cls, workflow_instance_id: str, metadata: dict
    ) -> SupportTrace | None:
        trace = cls._repository.get_by_workflow(workflow_instance_id)
        if trace is None:
            return None
        return cls._repository.update_runtime(trace, metadata)

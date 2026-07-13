"""Resolve runtime context from LogContext, logger, Celery, Lambda, env."""

from __future__ import annotations

from typing import Any

from shared.logging.context import LogContext, get_context_manager
from support_trace.runtime.celery_context import CeleryContextResolver
from support_trace.runtime.deployment import DeploymentMetadata
from support_trace.runtime.lambda_context import LambdaContextResolver
from support_trace.runtime.logger_integration import LoggerIntegration
from support_trace.runtime.runtime_context import RuntimeContextBuilder
from support_trace.runtime.types import RuntimeContext


class RuntimeResolver:
    @classmethod
    def resolve(cls, *, log_context: LogContext | None = None) -> RuntimeContext:
        ctx = log_context or get_context_manager().get()
        logger_targets = LoggerIntegration.resolve_log_targets()
        deployment = DeploymentMetadata.resolve()
        celery = CeleryContextResolver.resolve()
        lambda_ctx = LambdaContextResolver.resolve()

        fields: dict[str, Any] = {
            "correlation_id": ctx.correlation_id if ctx else None,
            "request_id": ctx.request_id if ctx else None,
            "log_group": logger_targets.get("log_group"),
            "log_stream": logger_targets.get("log_stream"),
            "log_region": logger_targets.get("log_region"),
            "deployment_version": deployment.get("deployment_version"),
            "git_commit": deployment.get("git_commit"),
            "release_version": deployment.get("release_version"),
            "hostname": deployment.get("hostname"),
            "environment": deployment.get("environment") or (ctx.environment if ctx else None),
            "availability_zone": deployment.get("availability_zone"),
            "aws_account": deployment.get("aws_account"),
            "container_id": deployment.get("container_id"),
            "pod_name": deployment.get("pod_name"),
            "celery_task_id": celery.get("celery_task_id"),
            "celery_worker": celery.get("celery_worker"),
            "celery_queue": celery.get("celery_queue"),
            "lambda_request_id": lambda_ctx.get("lambda_request_id"),
        }
        return RuntimeContextBuilder.build(**fields)

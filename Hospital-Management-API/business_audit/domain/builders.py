"""Construct immutable BusinessAudit instances from validated input."""

from __future__ import annotations

from business_audit.domain.context import next_sequence_no, resolve_workflow_context
from business_audit.domain.repository import BusinessAuditRepository
from business_audit.domain.types import ValidatedBusinessAuditRequest
from business_audit.exceptions import AuditBuilderError
from business_audit.models import BusinessAudit
from shared.audit.base_builder import BaseAuditBuilder
from shared.logging.context import get_context_manager


class BusinessAuditBuilder(BaseAuditBuilder):
    """Builds unsaved BusinessAudit model instances with workflow metadata."""

    _repository = BusinessAuditRepository()

    @classmethod
    def build(cls, validated: ValidatedBusinessAuditRequest) -> BusinessAudit:
        try:
            return cls._build_impl(validated)
        except Exception as exc:
            if isinstance(exc, AuditBuilderError):
                raise
            raise AuditBuilderError(str(exc)) from exc

    @classmethod
    def _build_impl(cls, validated: ValidatedBusinessAuditRequest) -> BusinessAudit:
        context = get_context_manager().get()
        workflow_ctx = resolve_workflow_context(
            workflow_instance_id=validated.workflow_instance_id,
            parent_workflow_instance_id=validated.parent_workflow_instance_id,
            correlation_id=validated.correlation_id,
            request_id=validated.request_id,
            tenant=validated.tenant,
            environment=validated.environment,
            deployment=validated.deployment,
            context=context,
        )

        workflow_instance_id = workflow_ctx["workflow_instance_id"]
        if not workflow_instance_id:
            raise AuditBuilderError("workflow_instance_id is required.")

        correlation_id = cls.resolve_correlation_id(
            workflow_ctx["correlation_id"], context=context
        )
        request_id = workflow_ctx["request_id"]
        user_id = validated.user_id or context.user_id

        sequence_no = validated.sequence_no
        if sequence_no is None:
            sequence_no = next_sequence_no(workflow_instance_id, repository=cls._repository)

        execution_time_ms = validated.execution_time_ms
        if (
            execution_time_ms is None
            and validated.started_at is not None
            and validated.finished_at is not None
        ):
            delta = validated.finished_at - validated.started_at
            execution_time_ms = int(delta.total_seconds() * 1000)

        meta_extra = {
            "workflow_instance_id": workflow_instance_id,
            "parent_workflow_instance_id": workflow_ctx["parent_workflow_instance_id"],
            "correlation_id": correlation_id,
            "request_id": request_id,
            "domain": validated.domain,
            "service": validated.service,
            "operation": validated.operation,
            "execution_ms": execution_time_ms,
            "retry": validated.retry_count,
            "max_retry": validated.max_retry,
            "retry_reason": validated.retry_reason,
        }
        if validated.external_provider is not None:
            meta_extra["provider"] = validated.external_provider.value

        new_value = cls.build_payload_envelope(
            organization_id=validated.organization_id,
            payload=validated.payload,
            request_id=request_id,
            occurred_at=validated.occurred_at,
            service_name=validated.service,
            environment=workflow_ctx["environment"],
            deployment=workflow_ctx["deployment"],
            tenant=workflow_ctx["tenant"],
            meta_extra=meta_extra,
        )

        return BusinessAudit(
            correlation_id=correlation_id,
            request_id=request_id,
            workflow_type=validated.workflow_type,
            workflow_instance_id=workflow_instance_id,
            parent_workflow_instance_id=workflow_ctx["parent_workflow_instance_id"],
            sequence_no=sequence_no,
            category=validated.category,
            action=validated.action,
            event=validated.event,
            domain=validated.domain,
            service=validated.service,
            operation=validated.operation,
            resource_type=validated.resource_type,
            resource_id=validated.resource_id,
            actor_type=validated.actor_type,
            user_id=user_id,
            organization_id=validated.organization_id,
            tenant=workflow_ctx["tenant"],
            environment=workflow_ctx["environment"],
            deployment=workflow_ctx["deployment"],
            status=validated.status,
            outcome=validated.outcome,
            state_before=validated.state_before,
            state_after=validated.state_after,
            started_at=validated.started_at,
            finished_at=validated.finished_at,
            execution_time_ms=execution_time_ms,
            retry_count=validated.retry_count,
            max_retry=validated.max_retry,
            retry_reason=validated.retry_reason,
            external_provider=validated.external_provider,
            provider_reference=validated.provider_reference,
            provider_response_code=validated.provider_response_code,
            provider_response_message=validated.provider_response_message,
            new_value=new_value,
            remarks=validated.remarks,
        )

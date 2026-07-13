"""Public API for recording immutable business audit events."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from business_audit.domain.builders import BusinessAuditBuilder
from business_audit.domain.repository import BusinessAuditRepository
from business_audit.domain.types import BusinessAuditResult
from business_audit.domain.validators import BusinessAuditRequestValidator
from business_audit.enums import (
    ActorType,
    BusinessAuditAction,
    BusinessResourceType,
    EventCategory,
    ExternalProvider,
    WorkflowOutcome,
    WorkflowStatus,
    WorkflowType,
)
from business_audit.exceptions import BusinessAuditError
from shared.audit.base_service import BaseAuditService


class BusinessAuditService(BaseAuditService):
    """Centralized, fail-open service for creating business audit records."""

    audit_logger_name = "business_audit_record_failed"
    _validator = BusinessAuditRequestValidator
    _builder = BusinessAuditBuilder
    _repository = BusinessAuditRepository()

    @classmethod
    def record(
        cls,
        *,
        action: BusinessAuditAction | str,
        event: str,
        workflow_type: WorkflowType | str,
        workflow_instance_id: str,
        category: EventCategory | str,
        domain: str,
        service: str,
        operation: str,
        resource_type: BusinessResourceType | str,
        resource_id: str,
        organization_id: str,
        status: WorkflowStatus | str,
        outcome: WorkflowOutcome | str = WorkflowOutcome.UNKNOWN,
        actor_type: ActorType | str,
        parent_workflow_instance_id: str | None = None,
        sequence_no: int | None = None,
        state_before: str | None = None,
        state_after: str | None = None,
        user_id: str | None = None,
        payload: dict[str, Any] | None = None,
        correlation_id: str | None = None,
        request_id: str | None = None,
        started_at: datetime | None = None,
        finished_at: datetime | None = None,
        execution_time_ms: int | None = None,
        retry_count: int = 0,
        max_retry: int | None = None,
        retry_reason: str | None = None,
        external_provider: ExternalProvider | str | None = None,
        provider_reference: str | None = None,
        provider_response_code: str | None = None,
        provider_response_message: str | None = None,
        tenant: str | None = None,
        environment: str | None = None,
        deployment: str | None = None,
        remarks: str | None = None,
        validate_references: bool = True,
        raise_on_failure: bool = False,
    ) -> BusinessAuditResult:
        correlation_for_log = correlation_id or workflow_instance_id or ""

        def _do_record() -> BusinessAuditResult:
            nonlocal correlation_for_log
            validated = cls._validator.validate(
                action=action,
                event=event,
                workflow_type=workflow_type,
                workflow_instance_id=workflow_instance_id,
                category=category,
                domain=domain,
                service=service,
                operation=operation,
                resource_type=resource_type,
                resource_id=resource_id,
                organization_id=organization_id,
                status=status,
                outcome=outcome,
                actor_type=actor_type,
                parent_workflow_instance_id=parent_workflow_instance_id,
                sequence_no=sequence_no,
                state_before=state_before,
                state_after=state_after,
                user_id=user_id,
                payload=payload,
                correlation_id=correlation_id,
                request_id=request_id,
                started_at=started_at,
                finished_at=finished_at,
                execution_time_ms=execution_time_ms,
                retry_count=retry_count,
                max_retry=max_retry,
                retry_reason=retry_reason,
                external_provider=external_provider,
                provider_reference=provider_reference,
                provider_response_code=provider_response_code,
                provider_response_message=provider_response_message,
                tenant=tenant,
                environment=environment,
                deployment=deployment,
                remarks=remarks,
                validate_references=validate_references,
            )
            correlation_for_log = validated.correlation_id or correlation_for_log
            record = cls._builder.build(validated)
            correlation_for_log = record.correlation_id
            saved = cls._repository.save(record)
            return BusinessAuditResult(
                success=True,
                audit_id=saved.id,
                correlation_id=saved.correlation_id,
                workflow_instance_id=saved.workflow_instance_id,
                sequence_no=saved.sequence_no,
            )

        result = cls._record_fail_open(
            correlation_id=correlation_for_log,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            error_base=BusinessAuditError,
            record_fn=_do_record,
            raise_on_failure=raise_on_failure,
            log_extra={"workflow_instance_id": workflow_instance_id},
        )
        if isinstance(result, BusinessAuditResult):
            if result.success and result.audit_id:
                try:
                    from support_trace.workflow.hooks import (
                        schedule_workflow_state_update_from_business_audit,
                    )

                    schedule_workflow_state_update_from_business_audit(
                        audit_id=result.audit_id
                    )
                except Exception:
                    pass
            return result
        return BusinessAuditResult(
            success=False,
            correlation_id=result.correlation_id,
            workflow_instance_id=workflow_instance_id,
            error=result.error,
            error_type=result.error_type,
        )

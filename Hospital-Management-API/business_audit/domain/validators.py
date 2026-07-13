"""Input validation for Business Audit record creation."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from business_audit.constants import (
    MAX_EXECUTION_TIME_MS,
    PROVIDER_RESPONSE_MESSAGE_LENGTH,
    RETRY_REASON_LENGTH,
    STATE_LENGTH,
)
from business_audit.domain.types import ValidatedBusinessAuditRequest
from business_audit.domain.utils import (
    validate_business_payload,
    validate_business_remarks,
    validate_business_summary,
)
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
from business_audit.exceptions import AuditSerializationError, AuditValidationError
from shared.audit.base_validator import is_valid_uuid, normalize_enum_value


class BusinessAuditRequestValidator:
    """Validates business audit record input before building and persistence."""

    @classmethod
    def validate(
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
        occurred_at: datetime | None = None,
        validate_references: bool = True,
    ) -> ValidatedBusinessAuditRequest:
        try:
            return cls._validate_impl(
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
                occurred_at=occurred_at,
                validate_references=validate_references,
            )
        except (ValueError, TypeError, AuditSerializationError) as exc:
            raise AuditValidationError(str(exc)) from exc

    @classmethod
    def _validate_impl(
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
        outcome: WorkflowOutcome | str,
        actor_type: ActorType | str,
        parent_workflow_instance_id: str | None,
        sequence_no: int | None,
        state_before: str | None,
        state_after: str | None,
        user_id: str | None,
        payload: dict[str, Any] | None,
        correlation_id: str | None,
        request_id: str | None,
        started_at: datetime | None,
        finished_at: datetime | None,
        execution_time_ms: int | None,
        retry_count: int,
        max_retry: int | None,
        retry_reason: str | None,
        external_provider: ExternalProvider | str | None,
        provider_reference: str | None,
        provider_response_code: str | None,
        provider_response_message: str | None,
        tenant: str | None,
        environment: str | None,
        deployment: str | None,
        remarks: str | None,
        occurred_at: datetime | None,
        validate_references: bool,
    ) -> ValidatedBusinessAuditRequest:
        action_value = normalize_enum_value(action, BusinessAuditAction)
        workflow_type_value = normalize_enum_value(workflow_type, WorkflowType)
        category_value = normalize_enum_value(category, EventCategory)
        resource_type_value = normalize_enum_value(resource_type, BusinessResourceType)
        status_value = normalize_enum_value(status, WorkflowStatus)
        outcome_value = normalize_enum_value(outcome, WorkflowOutcome)
        actor_type_value = normalize_enum_value(actor_type, ActorType)

        event_value = validate_business_summary(str(event))
        domain_value = str(domain).strip()
        if not domain_value:
            raise ValueError("domain is required.")
        service_value = str(service).strip()
        if not service_value:
            raise ValueError("service is required.")
        operation_value = str(operation).strip()
        if not operation_value:
            raise ValueError("operation is required.")

        workflow_instance_id_value = str(workflow_instance_id).strip()
        if not is_valid_uuid(workflow_instance_id_value):
            raise ValueError("workflow_instance_id must be a valid UUID.")

        organization_id_value = str(organization_id).strip()
        if not is_valid_uuid(organization_id_value):
            raise ValueError("organization_id must be a valid UUID.")

        resource_id_value = str(resource_id).strip()
        if not resource_id_value:
            raise ValueError("resource_id is required.")

        if parent_workflow_instance_id:
            parent_value = str(parent_workflow_instance_id).strip()
            if not is_valid_uuid(parent_value):
                raise ValueError("parent_workflow_instance_id must be a valid UUID.")
        else:
            parent_value = None

        if correlation_id is not None:
            correlation_id_value = str(correlation_id).strip()
            if not correlation_id_value:
                raise ValueError("correlation_id cannot be empty.")
            if not is_valid_uuid(correlation_id_value):
                raise ValueError("correlation_id must be a valid UUID.")
        else:
            correlation_id_value = None

        if sequence_no is not None and sequence_no < 1:
            raise ValueError("sequence_no must be a positive integer.")

        if execution_time_ms is not None:
            if execution_time_ms < 0:
                raise ValueError("execution_time_ms cannot be negative.")
            if execution_time_ms > MAX_EXECUTION_TIME_MS:
                raise ValueError(
                    f"execution_time_ms exceeds maximum of {MAX_EXECUTION_TIME_MS}."
                )

        if started_at and finished_at and finished_at < started_at:
            raise ValueError("finished_at cannot be before started_at.")

        if retry_count < 0:
            raise ValueError("retry_count cannot be negative.")
        if max_retry is not None and max_retry < 0:
            raise ValueError("max_retry cannot be negative.")

        payload_value = validate_business_payload(payload)

        external_provider_value = None
        if external_provider is not None:
            external_provider_value = ExternalProvider(
                normalize_enum_value(external_provider, ExternalProvider)
            )

        if validate_references:
            cls._validate_reference_existence(organization_id=organization_id_value)

        return ValidatedBusinessAuditRequest(
            action=BusinessAuditAction(action_value),
            event=event_value,
            workflow_type=WorkflowType(workflow_type_value),
            workflow_instance_id=workflow_instance_id_value,
            category=EventCategory(category_value),
            domain=domain_value[:64],
            service=service_value[:128],
            operation=operation_value[:128],
            resource_type=BusinessResourceType(resource_type_value),
            resource_id=resource_id_value[:64],
            organization_id=organization_id_value,
            status=WorkflowStatus(status_value),
            outcome=WorkflowOutcome(outcome_value),
            actor_type=ActorType(actor_type_value),
            parent_workflow_instance_id=parent_value,
            sequence_no=sequence_no,
            state_before=cls._optional_state(state_before),
            state_after=cls._optional_state(state_after),
            user_id=cls._optional_id(user_id),
            payload=payload_value,
            correlation_id=correlation_id_value,
            request_id=cls._optional_id(request_id),
            started_at=started_at,
            finished_at=finished_at,
            execution_time_ms=execution_time_ms,
            retry_count=retry_count,
            max_retry=max_retry,
            retry_reason=cls._optional_text(retry_reason, RETRY_REASON_LENGTH),
            external_provider=external_provider_value,
            provider_reference=cls._optional_id(provider_reference),
            provider_response_code=cls._optional_id(provider_response_code),
            provider_response_message=cls._optional_text(
                provider_response_message, PROVIDER_RESPONSE_MESSAGE_LENGTH
            ),
            tenant=cls._optional_id(tenant),
            environment=cls._optional_id(environment),
            deployment=cls._optional_id(deployment),
            remarks=validate_business_remarks(remarks),
            occurred_at=occurred_at,
        )

    @staticmethod
    def _optional_id(value: str | None) -> str | None:
        if value is None:
            return None
        normalized = str(value).strip()
        return normalized or None

    @staticmethod
    def _optional_state(value: str | None) -> str | None:
        if value is None:
            return None
        normalized = str(value).strip()
        return normalized[:STATE_LENGTH] if normalized else None

    @staticmethod
    def _optional_text(value: str | None, max_length: int) -> str | None:
        if value is None:
            return None
        normalized = str(value).strip()
        if not normalized:
            return None
        if len(normalized) > max_length:
            return normalized[: max_length - 3] + "..."
        return normalized

    @classmethod
    def _validate_reference_existence(cls, *, organization_id: str) -> None:
        from clinic.models import Clinic

        if not Clinic.objects.filter(pk=organization_id).exists():
            raise ValueError(f"organization_id not found: {organization_id}")

"""Input validation for Support Trace record creation."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from business_audit.enums import BusinessResourceType, WorkflowType
from shared.audit.base_validator import is_valid_uuid, normalize_enum_value
from support_trace.constants import MAX_EVENT_LABEL_LENGTH, MAX_WORKFLOW_STEP_LENGTH
from support_trace.domain.types import ValidatedSupportTraceRequest
from support_trace.domain.workflow_relationships import validate_parent_workflow
from support_trace.enums import TERMINAL_TRACE_STATUSES, SyncStatus, TraceSource, TraceStatus, WorkflowHealth
from support_trace.exceptions import TraceValidationError
from support_trace.models import SupportTrace


class SupportTraceRequestValidator:
    """Validates trace record input before build and persistence."""

    @classmethod
    def validate(
        cls,
        *,
        workflow_instance_id: str,
        workflow_type: WorkflowType | str,
        resource_type: BusinessResourceType | str,
        resource_id: str,
        organization_id: str,
        status: TraceStatus | str,
        last_event: str,
        last_source: TraceSource | str = TraceSource.SYSTEM,
        sync_status: SyncStatus | str = SyncStatus.PENDING,
        workflow_health: WorkflowHealth | str = WorkflowHealth.HEALTHY,
        workflow_depth: int = 0,
        parent_workflow_instance_id: str | None = None,
        correlation_id: str | None = None,
        request_id: str | None = None,
        current_state: str | None = None,
        workflow_step: str | None = None,
        last_sequence_no: int | None = None,
        first_event_at: datetime | None = None,
        last_event_at: datetime | None = None,
        started_at: datetime | None = None,
        completed_at: datetime | None = None,
        duration_ms: int | None = None,
        retry_count: int = 0,
        last_clinical_audit_id: UUID | None = None,
        last_business_audit_id: UUID | None = None,
        identifiers: dict[str, str] | None = None,
        workflow_fingerprint: str | None = None,
            search_vector: dict | None = None,
            current_snapshot: dict | None = None,
            runtime_metadata: dict | None = None,
            trace_version: int = 1,
            projection_version: int = 1,
        allow_status_regression: bool = False,
        validate_references: bool = True,
        existing: SupportTrace | None = None,
        **identifier_kwargs: Any,
    ) -> ValidatedSupportTraceRequest:
        try:
            return cls._validate_impl(
                workflow_instance_id=workflow_instance_id,
                workflow_type=workflow_type,
                resource_type=resource_type,
                resource_id=resource_id,
                organization_id=organization_id,
                status=status,
                last_event=last_event,
                last_source=last_source,
                sync_status=sync_status,
                workflow_health=workflow_health,
                workflow_depth=workflow_depth,
                parent_workflow_instance_id=parent_workflow_instance_id,
                correlation_id=correlation_id,
                request_id=request_id,
                current_state=current_state,
                workflow_step=workflow_step,
                last_sequence_no=last_sequence_no,
                first_event_at=first_event_at,
                last_event_at=last_event_at,
                started_at=started_at,
                completed_at=completed_at,
                duration_ms=duration_ms,
                retry_count=retry_count,
                last_clinical_audit_id=last_clinical_audit_id,
                last_business_audit_id=last_business_audit_id,
                identifiers=identifiers,
                workflow_fingerprint=workflow_fingerprint,
                search_vector=search_vector,
                current_snapshot=current_snapshot,
                runtime_metadata=runtime_metadata,
                trace_version=trace_version,
                projection_version=projection_version,
                allow_status_regression=allow_status_regression,
                validate_references=validate_references,
                existing=existing,
                **identifier_kwargs,
            )
        except ValueError as exc:
            raise TraceValidationError(str(exc)) from exc

    @classmethod
    def _validate_impl(
        cls,
        *,
        workflow_instance_id: str,
        workflow_type: WorkflowType | str,
        resource_type: BusinessResourceType | str,
        resource_id: str,
        organization_id: str,
        status: TraceStatus | str,
        last_event: str,
        last_source: TraceSource | str,
        sync_status: SyncStatus | str,
        workflow_health: WorkflowHealth | str,
        workflow_depth: int,
        parent_workflow_instance_id: str | None,
        correlation_id: str | None,
        request_id: str | None,
        current_state: str | None,
        workflow_step: str | None,
        last_sequence_no: int | None,
        first_event_at: datetime | None,
        last_event_at: datetime | None,
        started_at: datetime | None,
        completed_at: datetime | None,
        duration_ms: int | None,
        retry_count: int,
        last_clinical_audit_id: UUID | None,
        last_business_audit_id: UUID | None,
        identifiers: dict[str, str] | None,
        workflow_fingerprint: str | None,
        search_vector: dict | None,
        current_snapshot: dict | None,
        runtime_metadata: dict | None,
        trace_version: int,
        projection_version: int,
        allow_status_regression: bool,
        validate_references: bool,
        existing: SupportTrace | None,
        **identifier_kwargs: Any,
    ) -> ValidatedSupportTraceRequest:
        wf_id = str(workflow_instance_id).strip()
        if not cls._is_valid_workflow_id(wf_id):
            raise ValueError(
                "workflow_instance_id must be a valid UUID or clinical:* workflow id."
            )

        org_id = str(organization_id).strip()
        if not is_valid_uuid(org_id):
            raise ValueError("organization_id must be a valid UUID.")

        corr = str(correlation_id or "").strip()
        if not corr:
            raise ValueError("correlation_id is required.")
        if not is_valid_uuid(corr):
            raise ValueError("correlation_id must be a valid UUID.")

        if parent_workflow_instance_id:
            parent = str(parent_workflow_instance_id).strip()
            if not cls._is_valid_workflow_id(parent):
                raise ValueError(
                    "parent_workflow_instance_id must be a valid UUID "
                    "or clinical:* workflow id."
                )
            validate_parent_workflow(
                workflow_instance_id=wf_id,
                parent_workflow_instance_id=parent,
            )
        else:
            parent = None

        event_label = str(last_event).strip()
        if not event_label:
            raise ValueError("last_event is required.")
        if len(event_label) > MAX_EVENT_LABEL_LENGTH:
            raise ValueError(f"last_event exceeds {MAX_EVENT_LABEL_LENGTH} characters.")

        step = None
        if workflow_step:
            step = str(workflow_step).strip()
            if len(step) > MAX_WORKFLOW_STEP_LENGTH:
                raise ValueError(
                    f"workflow_step exceeds {MAX_WORKFLOW_STEP_LENGTH} characters."
                )

        resource_id_value = str(resource_id).strip()
        if not resource_id_value:
            raise ValueError("resource_id is required.")

        if not workflow_fingerprint:
            raise ValueError("workflow_fingerprint is required.")

        if last_sequence_no is not None and last_sequence_no < 1:
            raise ValueError("last_sequence_no must be a positive integer.")

        if existing and last_sequence_no is not None:
            prior = existing.last_sequence_no
            if prior is not None and last_sequence_no < prior:
                raise ValueError(
                    f"last_sequence_no cannot decrease ({last_sequence_no} < {prior})."
                )

        if existing:
            cls._validate_state_transition(
                existing.status,
                status,
                allow_regression=allow_status_regression,
            )

        if duration_ms is not None and duration_ms < 0:
            raise ValueError("duration_ms cannot be negative.")

        if retry_count < 0:
            raise ValueError("retry_count cannot be negative.")

        if validate_references:
            cls._validate_organization_exists(org_id)

        merged_ids = dict(identifiers or {})
        merged_ids.update(
            {k: v for k, v in identifier_kwargs.items() if v is not None}
        )

        return ValidatedSupportTraceRequest(
            correlation_id=corr,
            workflow_instance_id=wf_id,
            workflow_type=WorkflowType(normalize_enum_value(workflow_type, WorkflowType)),
            resource_type=BusinessResourceType(
                normalize_enum_value(resource_type, BusinessResourceType)
            ),
            resource_id=resource_id_value,
            organization_id=org_id,
            status=TraceStatus(normalize_enum_value(status, TraceStatus)),
            last_event=event_label,
            workflow_fingerprint=workflow_fingerprint,
            last_source=TraceSource(normalize_enum_value(last_source, TraceSource)),
            sync_status=SyncStatus(normalize_enum_value(sync_status, SyncStatus)),
            workflow_health=WorkflowHealth(
                normalize_enum_value(workflow_health, WorkflowHealth)
            ),
            workflow_depth=workflow_depth,
            parent_workflow_instance_id=parent,
            request_id=str(request_id).strip() if request_id else None,
            current_state=str(current_state or "").strip(),
            workflow_step=step,
            last_sequence_no=last_sequence_no,
            first_event_at=first_event_at,
            last_event_at=last_event_at,
            started_at=started_at,
            completed_at=completed_at,
            duration_ms=duration_ms,
            retry_count=retry_count,
            last_clinical_audit_id=last_clinical_audit_id,
            last_business_audit_id=last_business_audit_id,
            search_vector=search_vector,
            current_snapshot=current_snapshot or {},
            runtime_metadata=runtime_metadata or {},
            trace_version=trace_version,
            projection_version=projection_version,
            patient_account_id=merged_ids.get("patient_account_id"),
            patient_profile_id=merged_ids.get("patient_profile_id"),
            consultation_id=merged_ids.get("consultation_id"),
            encounter_id=merged_ids.get("encounter_id"),
            recommendation_id=merged_ids.get("recommendation_id"),
            booking_id=merged_ids.get("booking_id"),
            routing_id=merged_ids.get("routing_id"),
            report_id=merged_ids.get("report_id"),
            prescription_id=merged_ids.get("prescription_id"),
            payment_id=merged_ids.get("payment_id"),
            invoice_id=merged_ids.get("invoice_id"),
            laboratory_id=merged_ids.get("laboratory_id"),
            branch_id=merged_ids.get("branch_id"),
            provider_reference=merged_ids.get("provider_reference"),
            whatsapp_message_id=merged_ids.get("whatsapp_message_id"),
            phone_number=merged_ids.get("phone_number"),
            order_id=merged_ids.get("order_id"),
            first_seen_at=identifier_kwargs.get("first_seen_at"),
            last_seen_at=identifier_kwargs.get("last_seen_at"),
            identifier_count=int(identifier_kwargs.get("identifier_count") or 0),
        )

    @staticmethod
    def _is_valid_workflow_id(value: str) -> bool:
        if is_valid_uuid(value):
            return True
        # Deterministic clinical projection IDs: clinical:consultation:{uuid}
        if value.startswith("clinical:") and len(value) <= 80:
            parts = value.split(":")
            if len(parts) >= 3 and is_valid_uuid(parts[-1]):
                return True
        return False

    @staticmethod
    def _validate_state_transition(
        existing_status: str,
        new_status: TraceStatus | str,
        *,
        allow_regression: bool = False,
    ) -> None:
        if allow_regression:
            return
        new_val = (
            new_status.value if isinstance(new_status, TraceStatus) else str(new_status)
        )
        if existing_status in TERMINAL_TRACE_STATUSES and new_val not in TERMINAL_TRACE_STATUSES:
            raise ValueError(
                f"Cannot transition from terminal status {existing_status} to {new_val}."
            )

    @staticmethod
    def _validate_organization_exists(organization_id: str) -> None:
        from clinic.models import Clinic

        if not Clinic.objects.filter(pk=organization_id).exists():
            raise ValueError(f"organization_id {organization_id} does not exist.")

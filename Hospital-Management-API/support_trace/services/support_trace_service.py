"""Public API for recording Support Trace projection updates."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from business_audit.enums import BusinessResourceType, WorkflowType
from shared.audit.base_service import BaseAuditService
from support_trace.domain.builders import SupportTraceBuilder
from support_trace.domain.context import apply_trace_context
from support_trace.domain.repository import SupportTraceRepository
from support_trace.domain.types import SupportTraceResult
from support_trace.domain.validators import SupportTraceRequestValidator
from support_trace.enums import SyncStatus, TERMINAL_TRACE_STATUSES, TraceSource, TraceStatus, WorkflowHealth
from support_trace.exceptions import SupportTraceConcurrencyError, SupportTraceError

logger = logging.getLogger(__name__)


class SupportTraceService(BaseAuditService):
    """Centralized, fail-open service for mutable support trace projections."""

    audit_logger_name = "support_trace_record_failed"
    _validator = SupportTraceRequestValidator
    _builder = SupportTraceBuilder
    _repository = SupportTraceRepository()

    @classmethod
    def record(
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
        workflow_step: str | None = None,
        current_state: str | None = None,
        last_sequence_no: int | None = None,
        parent_workflow_instance_id: str | None = None,
        workflow_depth: int = 0,
        identifiers: dict[str, str] | None = None,
        correlation_id: str | None = None,
        request_id: str | None = None,
        event_at: datetime | None = None,
        completed_at: datetime | None = None,
        retry_count: int = 0,
        last_clinical_audit_id: UUID | None = None,
        last_business_audit_id: UUID | None = None,
        current_snapshot: dict | None = None,
        finalize_duration: bool = False,
        projection_version: int | None = None,
        allow_status_regression: bool = False,
        validate_references: bool = True,
        raise_on_failure: bool = False,
        first_seen_at: datetime | None = None,
        last_seen_at: datetime | None = None,
        identifier_count: int = 0,
    ) -> SupportTraceResult:
        correlation_for_log = correlation_id or workflow_instance_id or ""

        def _do_record() -> SupportTraceResult:
            nonlocal correlation_for_log
            now = event_at or datetime.now(timezone.utc)
            existing = cls._repository.get_by_workflow(workflow_instance_id)

            duration_ms = cls._compute_duration_ms(
                existing=existing,
                completed_at=completed_at,
                status=status,
                event_at=now,
                finalize_duration=finalize_duration,
            )
            workflow_health = cls._derive_workflow_health(
                status=status,
                sync_status=SyncStatus.INDEXED,
            )
            started_at = existing.started_at if existing else now
            first_event_at = existing.first_event_at if existing else now
            from support_trace.constants import PROJECTION_VERSION

            prepared = cls._builder.prepare_validated_fields(
                workflow_instance_id=workflow_instance_id,
                workflow_type=workflow_type,
                resource_type=resource_type,
                resource_id=resource_id,
                organization_id=organization_id,
                status=status,
                last_event=last_event,
                last_source=last_source,
                sync_status=SyncStatus.INDEXED,
                workflow_health=workflow_health,
                workflow_depth=workflow_depth,
                parent_workflow_instance_id=parent_workflow_instance_id,
                correlation_id=correlation_id,
                request_id=request_id,
                current_state=current_state,
                workflow_step=workflow_step,
                last_sequence_no=last_sequence_no,
                first_event_at=first_event_at,
                last_event_at=now,
                started_at=started_at,
                completed_at=completed_at,
                duration_ms=duration_ms,
                retry_count=retry_count,
                last_clinical_audit_id=last_clinical_audit_id,
                last_business_audit_id=last_business_audit_id,
                identifiers=identifiers,
                trace_version=existing.trace_version if existing else 1,
                projection_version=projection_version
                if projection_version is not None
                else PROJECTION_VERSION,
                current_snapshot=current_snapshot,
                first_seen_at=first_seen_at or (existing.first_seen_at if existing else None),
                last_seen_at=last_seen_at,
                identifier_count=identifier_count,
            )
            correlation_for_log = prepared["correlation_id"]

            validated = cls._validator.validate(
                **prepared,
                validate_references=validate_references,
                allow_status_regression=allow_status_regression,
                existing=existing,
            )
            fields = cls._builder.build(validated)
            from support_trace.runtime.runtime_service import RuntimeIntegrationService

            fields["runtime_metadata"] = RuntimeIntegrationService.merge_runtime_for_record(
                existing.runtime_metadata if existing else {}
            )

            try:
                trace, created = cls._repository.upsert(
                    fields,
                    expected_trace_version=existing.trace_version if existing else None,
                )
            except SupportTraceConcurrencyError:
                trace, created = cls._repository.upsert(fields)

            apply_trace_context(
                workflow_instance_id=trace.workflow_instance_id,
                correlation_id=trace.correlation_id,
            )

            return SupportTraceResult(
                success=True,
                correlation_id=trace.correlation_id,
                workflow_instance_id=trace.workflow_instance_id,
                trace_id=trace.id,
                trace_version=trace.trace_version,
                sync_status=trace.sync_status,
                created=created,
            )

        try:
            return cls._record_fail_open(
                correlation_id=correlation_for_log,
                action=last_event,
                resource_type=resource_type,
                resource_id=resource_id,
                error_base=SupportTraceError,
                record_fn=_do_record,
                raise_on_failure=raise_on_failure,
                log_extra={"workflow_instance_id": workflow_instance_id},
            )
        except SupportTraceError:
            raise
        except Exception:
            return cls._failure_result_with_sync(
                correlation_id=correlation_for_log or str(workflow_instance_id),
            )

    @classmethod
    def _compute_duration_ms(
        cls,
        *,
        existing: Any,
        completed_at: datetime | None,
        status: TraceStatus | str,
        event_at: datetime,
        finalize_duration: bool = False,
    ) -> int | None:
        status_val = status.value if isinstance(status, TraceStatus) else str(status)
        should_finalize = finalize_duration or status_val in TERMINAL_TRACE_STATUSES
        if not should_finalize:
            return existing.duration_ms if existing else None
        start = None
        if existing and existing.first_event_at:
            start = existing.first_event_at
        elif existing and existing.started_at:
            start = existing.started_at
        end = completed_at or event_at
        if start and end:
            delta = end - start
            return max(0, int(delta.total_seconds() * 1000))
        return None

    @classmethod
    def _derive_workflow_health(
        cls,
        *,
        status: TraceStatus | str,
        sync_status: SyncStatus | str,
    ) -> WorkflowHealth:
        sync_val = sync_status.value if isinstance(sync_status, SyncStatus) else str(sync_status)
        if sync_val == SyncStatus.FAILED:
            return WorkflowHealth.FAILED
        if sync_val == SyncStatus.RETRY:
            return WorkflowHealth.WARNING

        status_val = status.value if isinstance(status, TraceStatus) else str(status)
        if status_val == TraceStatus.FAILED:
            return WorkflowHealth.FAILED
        if status_val == TraceStatus.CANCELLED:
            return WorkflowHealth.BLOCKED
        if status_val in (TraceStatus.EXPIRED, TraceStatus.WAITING):
            return WorkflowHealth.WARNING
        if status_val in TERMINAL_TRACE_STATUSES:
            return WorkflowHealth.HEALTHY
        return WorkflowHealth.HEALTHY

    @classmethod
    def _failure_result_with_sync(cls, *, correlation_id: str) -> SupportTraceResult:
        return SupportTraceResult(
            success=False,
            correlation_id=correlation_id,
            sync_status=SyncStatus.FAILED,
            error="support trace indexing failed",
            error_type="SupportTraceError",
        )

    @classmethod
    def _failure_result(
        cls,
        *,
        correlation_id: str,
        error: str,
        error_type: str,
    ) -> SupportTraceResult:
        return SupportTraceResult(
            success=False,
            correlation_id=correlation_id,
            sync_status=SyncStatus.FAILED,
            error=error,
            error_type=error_type,
        )

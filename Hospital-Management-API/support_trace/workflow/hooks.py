"""on_commit hooks that project audit events into Support Trace."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from consultations_core.audit.commit import emit_after_commit
from shared.logging import LogModule, logger
from support_trace.domain.sync_event import SupportTraceSyncEvent
from support_trace.services.projection_engine import ProjectionEngine


def _project_business_audit(audit_id: str, **_kwargs: Any) -> None:
    try:
        from business_audit.models import BusinessAudit

        audit = BusinessAudit.objects.filter(pk=audit_id).first()
        if audit is None:
            return
        event = SupportTraceSyncEvent.from_business_audit(audit)
        ProjectionEngine.project(event, raise_on_failure=False)
    except Exception:
        logger.exception(
            "Support trace sync from business audit failed",
            module=LogModule.MONITORING,
            action="support_trace.sync.business_audit_failed",
            metadata={"audit_id": str(audit_id)},
        )


def _project_clinical_audit(audit_id: str, **_kwargs: Any) -> None:
    try:
        from clinical_audit.models import ClinicalAudit

        audit = ClinicalAudit.objects.filter(pk=audit_id).first()
        if audit is None:
            return
        event = SupportTraceSyncEvent.from_clinical_audit(audit)
        ProjectionEngine.project(event, raise_on_failure=False)
    except Exception:
        logger.exception(
            "Support trace sync from clinical audit failed",
            module=LogModule.MONITORING,
            action="support_trace.sync.clinical_audit_failed",
            metadata={"audit_id": str(audit_id)},
        )


def schedule_workflow_state_update_from_business_audit(
    *,
    audit_id: UUID | str,
) -> None:
    """Schedule Support Trace projection after Business Audit commit."""
    try:
        emit_after_commit(_project_business_audit, str(audit_id))
    except Exception:
        logger.exception(
            "Support trace schedule from business audit failed",
            module=LogModule.MONITORING,
            action="support_trace.schedule.business_audit_failed",
            metadata={"audit_id": str(audit_id)},
        )


def schedule_workflow_state_update_from_clinical_audit(
    *,
    audit_id: UUID | str,
) -> None:
    """Schedule Support Trace projection after Clinical Audit commit."""
    try:
        emit_after_commit(_project_clinical_audit, str(audit_id))
    except Exception:
        logger.exception(
            "Support trace schedule from clinical audit failed",
            module=LogModule.MONITORING,
            action="support_trace.schedule.clinical_audit_failed",
            metadata={"audit_id": str(audit_id)},
        )


def schedule_workflow_completed(*, audit_id: UUID | str, source: str = "business") -> None:
    if source == "clinical":
        schedule_workflow_state_update_from_clinical_audit(audit_id=audit_id)
    else:
        schedule_workflow_state_update_from_business_audit(audit_id=audit_id)


def schedule_workflow_failed(*, audit_id: UUID | str, source: str = "business") -> None:
    schedule_workflow_completed(audit_id=audit_id, source=source)


def schedule_retry_increment(*, audit_id: UUID | str, source: str = "business") -> None:
    schedule_workflow_completed(audit_id=audit_id, source=source)

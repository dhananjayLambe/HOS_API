"""on_commit hooks that project audit events into Support Trace."""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from consultations_core.audit.commit import emit_after_commit
from support_trace.domain.sync_event import SupportTraceSyncEvent
from support_trace.services.projection_engine import ProjectionEngine

logger = logging.getLogger(__name__)


def _project_business_audit(audit_id: str, **_kwargs: Any) -> None:
    try:
        from business_audit.models import BusinessAudit

        audit = BusinessAudit.objects.filter(pk=audit_id).first()
        if audit is None:
            return
        event = SupportTraceSyncEvent.from_business_audit(audit)
        ProjectionEngine.project(event, raise_on_failure=False)
    except Exception:
        logger.warning(
            "support_trace_sync_from_business_audit_failed",
            extra={"audit_id": str(audit_id)},
            exc_info=True,
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
        logger.warning(
            "support_trace_sync_from_clinical_audit_failed",
            extra={"audit_id": str(audit_id)},
            exc_info=True,
        )


def schedule_workflow_state_update_from_business_audit(
    *,
    audit_id: UUID | str,
) -> None:
    """Schedule Support Trace projection after Business Audit commit."""
    try:
        emit_after_commit(_project_business_audit, str(audit_id))
    except Exception:
        logger.warning(
            "support_trace_schedule_business_failed",
            extra={"audit_id": str(audit_id)},
            exc_info=True,
        )


def schedule_workflow_state_update_from_clinical_audit(
    *,
    audit_id: UUID | str,
) -> None:
    """Schedule Support Trace projection after Clinical Audit commit."""
    try:
        emit_after_commit(_project_clinical_audit, str(audit_id))
    except Exception:
        logger.warning(
            "support_trace_schedule_clinical_failed",
            extra={"audit_id": str(audit_id)},
            exc_info=True,
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

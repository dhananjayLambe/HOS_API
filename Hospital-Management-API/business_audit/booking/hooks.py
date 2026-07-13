"""Diagnostic booking business audit integration hooks."""

from __future__ import annotations

import logging
from typing import Any

from business_audit.booking.booking_audit_service import BookingAuditService
from business_audit.booking.constants import (
    CONFIRMATION_SOURCE_SYSTEM,
    CONFIRMATION_SOURCE_VISIT,
    DOMAIN_DIAGNOSTICS,
    DOMAIN_LABS,
    OPERATION_ASSIGN_LAB,
    OPERATION_RESCHEDULE_VISIT,
    SERVICE_ROUTING,
    SERVICE_VISIT_WORKFLOW,
)
from business_audit.domain.context import apply_workflow_context
from consultations_core.audit.commit import emit_after_commit

logger = logging.getLogger(__name__)


def _apply_booking_workflow(order) -> None:
    apply_workflow_context(workflow_instance_id=str(order.pk))


def schedule_booking_business_created(
    *,
    order,
    user=None,
    request_id: str | None = None,
) -> None:
    try:
        _apply_booking_workflow(order)
        emit_after_commit(
            BookingAuditService.emit_created,
            order,
            user=user,
            request_id=request_id,
        )
    except Exception:
        logger.warning(
            "booking_business_created_schedule_failed",
            exc_info=True,
            extra={"booking_id": str(order.pk)},
        )


def schedule_booking_business_confirmed(
    *,
    order,
    user=None,
    confirmation_source: str = CONFIRMATION_SOURCE_SYSTEM,
    request_id: str | None = None,
) -> None:
    try:
        _apply_booking_workflow(order)
        emit_after_commit(
            BookingAuditService.emit_confirmed,
            order,
            user=user,
            confirmation_source=confirmation_source,
            request_id=request_id,
        )
    except Exception:
        logger.warning(
            "booking_business_confirmed_schedule_failed",
            exc_info=True,
            extra={"booking_id": str(order.pk)},
        )


def schedule_booking_business_modified(
    *,
    order,
    user=None,
    modification_reason: str,
    before_snapshot: dict[str, Any],
    after_snapshot: dict[str, Any],
    service: str = SERVICE_VISIT_WORKFLOW,
    operation: str = OPERATION_RESCHEDULE_VISIT,
    domain: str = DOMAIN_LABS,
) -> None:
    try:
        _apply_booking_workflow(order)
        emit_after_commit(
            BookingAuditService.emit_modified,
            order,
            user=user,
            modification_reason=modification_reason,
            before_snapshot=before_snapshot,
            after_snapshot=after_snapshot,
            service=service,
            operation=operation,
            domain=domain,
        )
    except Exception:
        logger.warning(
            "booking_business_modified_schedule_failed",
            exc_info=True,
            extra={"booking_id": str(order.pk)},
        )


def schedule_booking_business_modified_lab_reassignment(
    *,
    order,
    user=None,
    old_branch_id,
    new_branch_id,
) -> None:
    schedule_booking_business_modified(
        order=order,
        user=user,
        modification_reason="laboratory_reassignment",
        before_snapshot={"branch_id": str(old_branch_id) if old_branch_id else None},
        after_snapshot={"branch_id": str(new_branch_id) if new_branch_id else None},
        service=SERVICE_ROUTING,
        operation=OPERATION_ASSIGN_LAB,
        domain=DOMAIN_DIAGNOSTICS,
    )


def schedule_booking_business_cancelled(
    *,
    order,
    user=None,
    cancellation_reason: str = "",
    prior_status: str | None = None,
) -> None:
    try:
        _apply_booking_workflow(order)
        emit_after_commit(
            BookingAuditService.emit_cancelled,
            order,
            user=user,
            cancellation_reason=cancellation_reason,
            prior_status=prior_status,
        )
    except Exception:
        logger.warning(
            "booking_business_cancelled_schedule_failed",
            exc_info=True,
            extra={"booking_id": str(order.pk)},
        )


def schedule_booking_business_expired(
    *,
    order,
    expiration_reason: str,
    prior_status: str | None = None,
) -> None:
    try:
        _apply_booking_workflow(order)
        emit_after_commit(
            BookingAuditService.emit_expired,
            order,
            expiration_reason=expiration_reason,
            prior_status=prior_status,
        )
    except Exception:
        logger.warning(
            "booking_business_expired_schedule_failed",
            exc_info=True,
            extra={"booking_id": str(order.pk)},
        )


def schedule_booking_business_closed(
    *,
    order,
    prior_macro_state: str | None = None,
) -> None:
    try:
        _apply_booking_workflow(order)
        emit_after_commit(
            BookingAuditService.emit_closed,
            order,
            prior_macro_state=prior_macro_state,
        )
    except Exception:
        logger.warning(
            "booking_business_closed_schedule_failed",
            exc_info=True,
            extra={"booking_id": str(order.pk)},
        )

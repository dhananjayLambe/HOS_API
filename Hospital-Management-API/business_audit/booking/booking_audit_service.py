"""Facade for diagnostic booking operational business audit events."""

from __future__ import annotations

import logging
from typing import Any

from business_audit.booking.constants import (
    BOOKING_STATE_CANCELLED,
    BOOKING_STATE_CLOSED,
    BOOKING_STATE_CONFIRMED,
    BOOKING_STATE_CREATED,
    BOOKING_STATE_EXPIRED,
    BOOKING_STATE_MODIFIED,
    CONFIRMATION_SOURCE_SYSTEM,
    DOMAIN_DIAGNOSTICS,
    DOMAIN_LABS,
    DOWNSTREAM_CANCELLATION,
    DOWNSTREAM_CLOSURE,
    DOWNSTREAM_CONFIRMATION,
    DOWNSTREAM_EXPIRATION,
    DOWNSTREAM_MODIFICATION,
    DOWNSTREAM_ORDER_CREATE,
    OPERATION_CANCEL_ORDER,
    OPERATION_CLOSE_ORDER,
    OPERATION_CONFIRM_ORDER,
    OPERATION_CONFIRM_VISIT,
    OPERATION_CREATE_ORDER,
    OPERATION_EXPIRE,
    OPERATION_RESCHEDULE_VISIT,
    OPERATION_ASSIGN_LAB,
    SERVICE_CANCELLATION,
    SERVICE_EXPIRATION,
    SERVICE_ORDER_CREATION,
    SERVICE_ORDER_STATUS,
    SERVICE_ROUTING,
    SERVICE_VISIT_WORKFLOW,
)
from business_audit.booking.payload_builder import BookingPayloadBuilder
from business_audit.booking.repository import BookingAuditRepository
from business_audit.booking.snapshot_builder import BookingSnapshotBuilder
from business_audit.domain.context import apply_workflow_context
from business_audit.domain.types import BusinessAuditResult
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
from business_audit.services import BusinessAuditService

logger = logging.getLogger(__name__)


class BookingAuditService:
    """Translate diagnostic booking lifecycle events into BusinessAuditService.record()."""

    _repository = BookingAuditRepository()

    @classmethod
    def emit_created(
        cls,
        order,
        *,
        user=None,
        correlation_id: str | None = None,
        request_id: str | None = None,
    ) -> BusinessAuditResult | None:
        booking_id = str(order.pk)
        if cls._repository.has_action_for_booking(
            booking_id=booking_id,
            action=BusinessAuditAction.BOOKING_CREATED,
        ):
            return None

        payload = BookingPayloadBuilder.build_created(
            order,
            downstream_systems=DOWNSTREAM_ORDER_CREATE,
        )
        return cls._record(
            action=BusinessAuditAction.BOOKING_CREATED,
            event="Booking created",
            order=order,
            user=user,
            actor_type=ActorType.SYSTEM,
            status=WorkflowStatus.COMPLETED,
            outcome=WorkflowOutcome.SUCCESS,
            state_before=None,
            state_after=BOOKING_STATE_CREATED,
            domain=DOMAIN_DIAGNOSTICS,
            service=SERVICE_ORDER_CREATION,
            operation=OPERATION_CREATE_ORDER,
            payload=payload,
            correlation_id=correlation_id,
            request_id=request_id,
        )

    @classmethod
    def emit_confirmed(
        cls,
        order,
        *,
        user=None,
        confirmation_source: str = CONFIRMATION_SOURCE_SYSTEM,
        correlation_id: str | None = None,
        request_id: str | None = None,
    ) -> BusinessAuditResult | None:
        booking_id = str(order.pk)
        if cls._repository.has_action_for_booking(
            booking_id=booking_id,
            action=BusinessAuditAction.BOOKING_CONFIRMED,
        ):
            return None

        service = SERVICE_ORDER_CREATION
        operation = OPERATION_CONFIRM_ORDER
        domain = DOMAIN_DIAGNOSTICS
        if confirmation_source != CONFIRMATION_SOURCE_SYSTEM:
            service = SERVICE_VISIT_WORKFLOW
            operation = OPERATION_CONFIRM_VISIT
            domain = DOMAIN_LABS

        payload = BookingPayloadBuilder.build_confirmed(
            order,
            downstream_systems=DOWNSTREAM_CONFIRMATION,
            confirmation_source=confirmation_source,
        )
        return cls._record(
            action=BusinessAuditAction.BOOKING_CONFIRMED,
            event="Booking confirmed",
            order=order,
            user=user,
            actor_type=ActorType.SYSTEM,
            status=WorkflowStatus.COMPLETED,
            outcome=WorkflowOutcome.SUCCESS,
            state_before=BOOKING_STATE_CREATED,
            state_after=BOOKING_STATE_CONFIRMED,
            domain=domain,
            service=service,
            operation=operation,
            payload=payload,
            correlation_id=correlation_id,
            request_id=request_id,
        )

    @classmethod
    def emit_modified(
        cls,
        order,
        *,
        user=None,
        modification_reason: str,
        before_snapshot: dict[str, Any],
        after_snapshot: dict[str, Any],
        correlation_id: str | None = None,
        request_id: str | None = None,
        service: str = SERVICE_VISIT_WORKFLOW,
        operation: str = OPERATION_RESCHEDULE_VISIT,
        domain: str = DOMAIN_LABS,
    ) -> BusinessAuditResult | None:
        booking_id = str(order.pk)
        version = cls._repository.next_modification_version(booking_id)
        if cls._repository.has_modification_version(booking_id=booking_id, version=version):
            return None

        macro_state = cls._repository.current_macro_state(booking_id) or BOOKING_STATE_CONFIRMED
        change_snapshot = BookingSnapshotBuilder.modified_state(
            before=before_snapshot,
            after=after_snapshot,
            reason=modification_reason,
        )
        payload = BookingPayloadBuilder.build_modified(
            order,
            downstream_systems=DOWNSTREAM_MODIFICATION,
            modification_reason=modification_reason,
            modification_version=version,
            change_snapshot=change_snapshot,
        )
        return cls._record(
            action=BusinessAuditAction.BOOKING_MODIFIED,
            event="Booking modified",
            order=order,
            user=user,
            actor_type=ActorType.SYSTEM,
            status=WorkflowStatus.COMPLETED,
            outcome=WorkflowOutcome.SUCCESS,
            state_before=macro_state,
            state_after=BOOKING_STATE_MODIFIED,
            domain=domain,
            service=service,
            operation=operation,
            payload=payload,
            correlation_id=correlation_id,
            request_id=request_id,
        )

    @classmethod
    def emit_cancelled(
        cls,
        order,
        *,
        user=None,
        cancellation_reason: str = "",
        prior_status: str | None = None,
        correlation_id: str | None = None,
        request_id: str | None = None,
    ) -> BusinessAuditResult | None:
        booking_id = str(order.pk)
        if cls._repository.has_action_for_booking(
            booking_id=booking_id,
            action=BusinessAuditAction.BOOKING_CANCELLED,
        ):
            return None

        cancelled_by_id = None
        if user is not None and getattr(user, "is_authenticated", False):
            cancelled_by_id = str(getattr(user, "pk", ""))
        elif getattr(order, "cancelled_by_id", None):
            cancelled_by_id = str(order.cancelled_by_id)

        macro_state = cls._repository.current_macro_state(booking_id) or BOOKING_STATE_CONFIRMED
        change_snapshot = BookingSnapshotBuilder.cancelled_state(
            prior_status=prior_status or getattr(order, "status", None),
            cancellation_reason=cancellation_reason,
            cancelled_by_id=cancelled_by_id,
        )
        payload = BookingPayloadBuilder.build_cancelled(
            order,
            downstream_systems=DOWNSTREAM_CANCELLATION,
            cancellation_reason=cancellation_reason,
            cancelled_by_id=cancelled_by_id,
            prior_status=prior_status,
            change_snapshot=change_snapshot,
        )
        return cls._record(
            action=BusinessAuditAction.BOOKING_CANCELLED,
            event="Booking cancelled",
            order=order,
            user=user,
            actor_type=ActorType.SYSTEM,
            status=WorkflowStatus.COMPLETED,
            outcome=WorkflowOutcome.SUCCESS,
            state_before=macro_state,
            state_after=BOOKING_STATE_CANCELLED,
            domain=DOMAIN_DIAGNOSTICS,
            service=SERVICE_CANCELLATION,
            operation=OPERATION_CANCEL_ORDER,
            payload=payload,
            correlation_id=correlation_id,
            request_id=request_id,
        )

    @classmethod
    def emit_expired(
        cls,
        order,
        *,
        expiration_reason: str,
        prior_status: str | None = None,
        correlation_id: str | None = None,
    ) -> BusinessAuditResult | None:
        booking_id = str(order.pk)
        if cls._repository.has_action_for_booking(
            booking_id=booking_id,
            action=BusinessAuditAction.BOOKING_EXPIRED,
        ):
            return None

        prior = prior_status or getattr(order, "status", None)
        state_before = (
            BOOKING_STATE_CREATED
            if prior == "created"
            else BOOKING_STATE_CONFIRMED
        )
        payload = BookingPayloadBuilder.build_expired(
            order,
            downstream_systems=DOWNSTREAM_EXPIRATION,
            expiration_reason=expiration_reason,
            prior_status=prior,
        )
        return cls._record(
            action=BusinessAuditAction.BOOKING_EXPIRED,
            event="Booking expired",
            order=order,
            actor_type=ActorType.SCHEDULER,
            status=WorkflowStatus.COMPLETED,
            outcome=WorkflowOutcome.FAILURE,
            state_before=state_before,
            state_after=BOOKING_STATE_EXPIRED,
            domain=DOMAIN_DIAGNOSTICS,
            service=SERVICE_EXPIRATION,
            operation=OPERATION_EXPIRE,
            payload=payload,
            correlation_id=correlation_id,
        )

    @classmethod
    def emit_closed(
        cls,
        order,
        *,
        prior_macro_state: str | None = None,
        correlation_id: str | None = None,
    ) -> BusinessAuditResult | None:
        booking_id = str(order.pk)
        if cls._repository.has_action_for_booking(
            booking_id=booking_id,
            action=BusinessAuditAction.BOOKING_CLOSED,
        ):
            return None

        macro_state = prior_macro_state or cls._repository.current_macro_state(booking_id)
        if macro_state == BOOKING_STATE_MODIFIED:
            macro_state = BOOKING_STATE_CONFIRMED
        if macro_state is None:
            macro_state = BOOKING_STATE_CONFIRMED

        change_snapshot = BookingSnapshotBuilder.closed_state(
            prior_macro_state=macro_state,
            order_status=getattr(order, "status", None),
        )
        payload = BookingPayloadBuilder.build_closed(
            order,
            downstream_systems=DOWNSTREAM_CLOSURE,
            prior_macro_state=macro_state,
            change_snapshot=change_snapshot,
        )
        return cls._record(
            action=BusinessAuditAction.BOOKING_CLOSED,
            event="Booking closed",
            order=order,
            actor_type=ActorType.SYSTEM,
            status=WorkflowStatus.COMPLETED,
            outcome=WorkflowOutcome.SUCCESS,
            state_before=macro_state,
            state_after=BOOKING_STATE_CLOSED,
            domain=DOMAIN_DIAGNOSTICS,
            service=SERVICE_ORDER_STATUS,
            operation=OPERATION_CLOSE_ORDER,
            payload=payload,
            correlation_id=correlation_id,
        )

    @classmethod
    def _record(
        cls,
        *,
        action: BusinessAuditAction,
        event: str,
        order,
        actor_type: ActorType,
        status: WorkflowStatus,
        outcome: WorkflowOutcome,
        domain: str,
        service: str,
        operation: str,
        payload: dict[str, Any],
        state_before: str | None = None,
        state_after: str | None = None,
        user=None,
        correlation_id: str | None = None,
        request_id: str | None = None,
    ) -> BusinessAuditResult:
        booking_id = str(order.pk)
        user_id = None
        if user is not None and getattr(user, "is_authenticated", False):
            user_id = str(getattr(user, "pk", ""))

        recommendation_id = payload.get("recommendation_id")
        apply_workflow_context(workflow_instance_id=booking_id)

        encounter = order.encounter
        organization_id = str(encounter.clinic_id)

        return BusinessAuditService.record(
            action=action,
            event=event,
            workflow_type=WorkflowType.BOOKING,
            workflow_instance_id=booking_id,
            parent_workflow_instance_id=str(recommendation_id) if recommendation_id else None,
            category=EventCategory.BOOKING,
            domain=domain,
            service=service,
            operation=operation,
            resource_type=BusinessResourceType.BOOKING,
            resource_id=booking_id,
            organization_id=organization_id,
            status=status,
            outcome=outcome,
            actor_type=actor_type,
            state_before=state_before,
            state_after=state_after,
            user_id=user_id,
            payload=payload,
            correlation_id=correlation_id,
            request_id=request_id,
            external_provider=ExternalProvider.INTERNAL,
        )

    @classmethod
    def resolve_order_for_visit(cls, visit) -> Any:
        return visit.diagnostic_order

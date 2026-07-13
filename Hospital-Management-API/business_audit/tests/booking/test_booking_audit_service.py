"""Unit tests for BookingAuditService."""

from __future__ import annotations

from django.test import TestCase

from business_audit.booking.booking_audit_service import BookingAuditService
from business_audit.booking.constants import (
    BOOKING_STATE_CANCELLED,
    BOOKING_STATE_CLOSED,
    BOOKING_STATE_CONFIRMED,
    BOOKING_STATE_CREATED,
    BOOKING_STATE_EXPIRED,
    BOOKING_STATE_MODIFIED,
)
from business_audit.enums import BusinessAuditAction, WorkflowOutcome, WorkflowStatus, WorkflowType
from business_audit.models import BusinessAudit
from business_audit.tests.booking.support import create_booking_order, setup_booking_context
from diagnostics_engine.domain.cancellation import CancellationService
from diagnostics_engine.domain.order_status import OrderStatusAggregationService
from diagnostics_engine.models.choices import OrderStatus
from shared.logging.context import get_context_manager


class BookingAuditServiceTests(TestCase):
    def tearDown(self) -> None:
        get_context_manager().clear()

    def test_emit_created_fsm(self) -> None:
        ctx = setup_booking_context()
        order = create_booking_order(ctx)
        result = BookingAuditService.emit_created(order, user=ctx["doctor_user"])
        self.assertTrue(result.success)
        audit = BusinessAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.action, BusinessAuditAction.BOOKING_CREATED)
        self.assertEqual(audit.workflow_type, WorkflowType.BOOKING)
        self.assertEqual(audit.workflow_instance_id, str(order.pk))
        self.assertEqual(audit.parent_workflow_instance_id, ctx["recommendation_id"])
        self.assertIsNone(audit.state_before)
        self.assertEqual(audit.state_after, BOOKING_STATE_CREATED)

    def test_emit_created_idempotent(self) -> None:
        ctx = setup_booking_context()
        order = create_booking_order(ctx)
        first = BookingAuditService.emit_created(order, user=ctx["doctor_user"])
        second = BookingAuditService.emit_created(order, user=ctx["doctor_user"])
        self.assertTrue(first.success)
        self.assertIsNone(second)

    def test_emit_confirmed_fsm(self) -> None:
        ctx = setup_booking_context()
        order = create_booking_order(ctx)
        BookingAuditService.emit_created(order, user=ctx["doctor_user"])
        result = BookingAuditService.emit_confirmed(order, user=ctx["doctor_user"])
        self.assertTrue(result.success)
        audit = BusinessAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.action, BusinessAuditAction.BOOKING_CONFIRMED)
        self.assertEqual(audit.state_before, BOOKING_STATE_CREATED)
        self.assertEqual(audit.state_after, BOOKING_STATE_CONFIRMED)

    def test_emit_confirmed_idempotent(self) -> None:
        ctx = setup_booking_context()
        order = create_booking_order(ctx)
        first = BookingAuditService.emit_confirmed(order, user=ctx["doctor_user"])
        second = BookingAuditService.emit_confirmed(order, user=ctx["doctor_user"])
        self.assertTrue(first.success)
        self.assertIsNone(second)

    def test_emit_modified_fsm(self) -> None:
        ctx = setup_booking_context()
        order = create_booking_order(ctx)
        BookingAuditService.emit_confirmed(order, user=ctx["doctor_user"])
        result = BookingAuditService.emit_modified(
            order,
            modification_reason="slot_reschedule",
            before_snapshot={"slot": {"date": "2026-07-10"}},
            after_snapshot={"slot": {"date": "2026-07-12"}},
        )
        self.assertTrue(result.success)
        audit = BusinessAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.action, BusinessAuditAction.BOOKING_MODIFIED)
        self.assertEqual(audit.state_before, BOOKING_STATE_CONFIRMED)
        self.assertEqual(audit.state_after, BOOKING_STATE_MODIFIED)

    def test_emit_modified_version_idempotency(self) -> None:
        ctx = setup_booking_context()
        order = create_booking_order(ctx)
        first = BookingAuditService.emit_modified(
            order,
            modification_reason="slot_reschedule",
            before_snapshot={"a": 1},
            after_snapshot={"a": 2},
        )
        second = BookingAuditService.emit_modified(
            order,
            modification_reason="slot_reschedule",
            before_snapshot={"a": 2},
            after_snapshot={"a": 3},
        )
        self.assertTrue(first.success)
        self.assertTrue(second.success)
        audits = BusinessAudit.objects.filter(
            resource_id=str(order.pk),
            action=BusinessAuditAction.BOOKING_MODIFIED,
        )
        self.assertEqual(audits.count(), 2)

    def test_emit_cancelled_fsm(self) -> None:
        ctx = setup_booking_context()
        order = create_booking_order(ctx)
        BookingAuditService.emit_confirmed(order, user=ctx["doctor_user"])
        result = BookingAuditService.emit_cancelled(
            order,
            user=ctx["doctor_user"],
            cancellation_reason="Patient requested",
            prior_status=OrderStatus.CONFIRMED,
        )
        self.assertTrue(result.success)
        audit = BusinessAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.state_after, BOOKING_STATE_CANCELLED)

    def test_emit_expired_fsm(self) -> None:
        ctx = setup_booking_context()
        order = create_booking_order(ctx)
        result = BookingAuditService.emit_expired(
            order,
            expiration_reason="confirmation_timeout",
            prior_status=OrderStatus.CREATED,
        )
        self.assertTrue(result.success)
        audit = BusinessAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.state_after, BOOKING_STATE_EXPIRED)
        self.assertEqual(audit.outcome, WorkflowOutcome.FAILURE)
        self.assertEqual(audit.status, WorkflowStatus.COMPLETED)

    def test_emit_closed_fsm(self) -> None:
        ctx = setup_booking_context()
        order = create_booking_order(ctx)
        BookingAuditService.emit_confirmed(order, user=ctx["doctor_user"])
        result = BookingAuditService.emit_closed(order)
        self.assertTrue(result.success)
        audit = BusinessAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.state_after, BOOKING_STATE_CLOSED)

    def test_cancellation_service_wires_audit(self) -> None:
        ctx = setup_booking_context()
        order = create_booking_order(ctx)
        with self.captureOnCommitCallbacks(execute=True):
            CancellationService.cancel_order(order, ctx["doctor_user"], reason="No show")
        self.assertTrue(
            BusinessAudit.objects.filter(
                resource_id=str(order.pk),
                action=BusinessAuditAction.BOOKING_CANCELLED,
            ).exists()
        )

    def test_order_completed_wires_closed(self) -> None:
        ctx = setup_booking_context()
        order = create_booking_order(ctx)
        order.status = OrderStatus.REPORT_READY
        order.save(update_fields=["status"])
        with self.captureOnCommitCallbacks(execute=True):
            OrderStatusAggregationService._transition(order, OrderStatus.COMPLETED)
        self.assertTrue(
            BusinessAudit.objects.filter(
                resource_id=str(order.pk),
                action=BusinessAuditAction.BOOKING_CLOSED,
            ).exists()
        )

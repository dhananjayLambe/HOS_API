"""Integration tests for booking business audit workflow."""

from __future__ import annotations

from unittest.mock import patch

from django.test import TestCase

from business_audit.booking.booking_audit_service import BookingAuditService
from business_audit.booking.repository import BookingAuditRepository
from business_audit.enums import BusinessAuditAction
from business_audit.tests.booking.support import create_booking_order, setup_booking_context
from diagnostics_engine.domain.order_creation import DiagnosticOrderCreationService
from shared.logging.context import get_context_manager


class BookingWorkflowIntegrationTests(TestCase):
    def tearDown(self) -> None:
        get_context_manager().clear()

    def test_full_lifecycle_timeline(self) -> None:
        ctx = setup_booking_context()
        order = create_booking_order(ctx)
        booking_id = str(order.pk)
        correlation_id = ctx["correlation_id"]

        BookingAuditService.emit_created(
            order, user=ctx["doctor_user"], correlation_id=correlation_id
        )
        BookingAuditService.emit_confirmed(
            order, user=ctx["doctor_user"], correlation_id=correlation_id
        )
        BookingAuditService.emit_modified(
            order,
            modification_reason="slot_reschedule",
            before_snapshot={"slot": {"date": "2026-07-10"}},
            after_snapshot={"slot": {"date": "2026-07-12"}},
            correlation_id=correlation_id,
        )
        BookingAuditService.emit_closed(order, correlation_id=correlation_id)

        rows = BookingAuditRepository().get_by_workflow(booking_id)
        self.assertEqual(len(rows), 4)
        self.assertEqual(rows[0].action, BusinessAuditAction.BOOKING_CREATED)
        self.assertEqual(rows[-1].action, BusinessAuditAction.BOOKING_CLOSED)
        self.assertTrue(all(r.correlation_id == correlation_id for r in rows))
        self.assertTrue(all(r.workflow_instance_id == booking_id for r in rows))
        self.assertEqual(rows[0].parent_workflow_instance_id, ctx["recommendation_id"])

    def test_cancellation_path(self) -> None:
        ctx = setup_booking_context()
        order = create_booking_order(ctx)
        BookingAuditService.emit_created(order, user=ctx["doctor_user"])
        BookingAuditService.emit_confirmed(order, user=ctx["doctor_user"])
        BookingAuditService.emit_cancelled(
            order,
            user=ctx["doctor_user"],
            cancellation_reason="Changed mind",
            prior_status="confirmed",
        )
        rows = BookingAuditRepository().get_by_booking(str(order.pk))
        self.assertEqual(rows[-1].action, BusinessAuditAction.BOOKING_CANCELLED)
        self.assertEqual(rows[-1].state_after, "Cancelled")

    def test_expiration_path(self) -> None:
        ctx = setup_booking_context()
        order = create_booking_order(ctx)
        BookingAuditService.emit_created(order, user=ctx["doctor_user"])
        BookingAuditService.emit_expired(
            order,
            expiration_reason="confirmation_timeout",
            prior_status="created",
        )
        rows = BookingAuditRepository().get_by_booking(str(order.pk))
        self.assertEqual(rows[-1].action, BusinessAuditAction.BOOKING_EXPIRED)

    def test_fail_open_hooks_do_not_raise(self) -> None:
        ctx = setup_booking_context()
        order = create_booking_order(ctx)
        from business_audit.booking.hooks import schedule_booking_business_created

        with patch.object(
            BookingAuditService,
            "emit_created",
            side_effect=RuntimeError("audit down"),
        ):
            schedule_booking_business_created(order=order, user=ctx["doctor_user"])

    def test_duplicate_booking_protection_on_created(self) -> None:
        ctx = setup_booking_context()
        order = create_booking_order(ctx)
        first = BookingAuditService.emit_created(order, user=ctx["doctor_user"])
        second = BookingAuditService.emit_created(order, user=ctx["doctor_user"])
        self.assertIsNotNone(first)
        self.assertIsNone(second)


class BookingOrderCreationHookIntegrationTests(TestCase):
    def tearDown(self) -> None:
        get_context_manager().clear()

    def test_order_creation_emits_created_and_confirmed_after_commit(self) -> None:
        ctx = setup_booking_context()
        with self.captureOnCommitCallbacks(execute=True):
            result = DiagnosticOrderCreationService.create_order_from_consultation(
                consultation=ctx["consultation"],
                branch=ctx["branch"],
                source="emr",
                created_by=ctx["doctor_user"],
            )
        self.assertFalse(result.idempotent)
        booking_id = str(result.order.pk)
        result.order.refresh_from_db()
        rows = BookingAuditRepository().get_by_booking(booking_id)
        actions = [r.action for r in rows]
        self.assertIn(BusinessAuditAction.BOOKING_CREATED, actions)
        self.assertIn(BusinessAuditAction.BOOKING_CONFIRMED, actions)
        self.assertEqual(result.order.operational_metadata.get("recommendation_id"), ctx["recommendation_id"])

    def test_idempotent_order_creation_skips_audit(self) -> None:
        ctx = setup_booking_context()
        with self.captureOnCommitCallbacks(execute=True):
            first = DiagnosticOrderCreationService.create_order_from_consultation(
                consultation=ctx["consultation"],
                branch=ctx["branch"],
                source="emr",
                created_by=ctx["doctor_user"],
            )
            second = DiagnosticOrderCreationService.create_order_from_consultation(
                consultation=ctx["consultation"],
                branch=ctx["branch"],
                source="emr",
                created_by=ctx["doctor_user"],
            )
        self.assertFalse(first.idempotent)
        self.assertTrue(second.idempotent)
        rows = BookingAuditRepository().get_by_booking(str(first.order.pk))
        self.assertEqual(len(rows), 2)

"""Unit tests for BookingAuditRepository."""

from __future__ import annotations

from django.test import TestCase

from business_audit.booking.booking_audit_service import BookingAuditService
from business_audit.booking.repository import BookingAuditRepository
from business_audit.enums import BusinessAuditAction
from business_audit.tests.booking.support import create_booking_order, setup_booking_context
from shared.logging.context import get_context_manager


class BookingAuditRepositoryTests(TestCase):
    def tearDown(self) -> None:
        get_context_manager().clear()

    def test_get_by_booking_and_workflow(self) -> None:
        ctx = setup_booking_context()
        order = create_booking_order(ctx)
        booking_id = str(order.pk)
        BookingAuditService.emit_created(order, user=ctx["doctor_user"])
        repo = BookingAuditRepository()
        by_booking = repo.get_by_booking(booking_id)
        by_workflow = repo.get_by_workflow(booking_id)
        self.assertEqual(len(by_booking), 1)
        self.assertEqual(len(by_workflow), 1)
        self.assertEqual(by_booking[0].action, BusinessAuditAction.BOOKING_CREATED)

    def test_has_action_for_booking(self) -> None:
        ctx = setup_booking_context()
        order = create_booking_order(ctx)
        booking_id = str(order.pk)
        repo = BookingAuditRepository()
        self.assertFalse(
            repo.has_action_for_booking(
                booking_id=booking_id,
                action=BusinessAuditAction.BOOKING_CREATED,
            )
        )
        BookingAuditService.emit_created(order, user=ctx["doctor_user"])
        self.assertTrue(
            repo.has_action_for_booking(
                booking_id=booking_id,
                action=BusinessAuditAction.BOOKING_CREATED,
            )
        )

    def test_modification_version_tracking(self) -> None:
        ctx = setup_booking_context()
        order = create_booking_order(ctx)
        booking_id = str(order.pk)
        repo = BookingAuditRepository()
        self.assertEqual(repo.next_modification_version(booking_id), 1)
        BookingAuditService.emit_modified(
            order,
            modification_reason="slot_reschedule",
            before_snapshot={"slot": {"date": "2026-07-10"}},
            after_snapshot={"slot": {"date": "2026-07-12"}},
        )
        self.assertEqual(repo.count_modified_events(booking_id), 1)
        self.assertEqual(repo.next_modification_version(booking_id), 2)

    def test_get_by_consultation_and_patient(self) -> None:
        ctx = setup_booking_context()
        order = create_booking_order(ctx)
        BookingAuditService.emit_created(order, user=ctx["doctor_user"])
        repo = BookingAuditRepository()
        by_consultation = repo.get_by_consultation(str(ctx["consultation"].id))
        by_patient = repo.get_by_patient(str(ctx["encounter"].patient_account_id))
        self.assertEqual(len(by_consultation), 1)
        self.assertEqual(len(by_patient), 1)

    def test_get_by_collection_mode(self) -> None:
        ctx = setup_booking_context()
        order = create_booking_order(ctx)
        BookingAuditService.emit_created(order, user=ctx["doctor_user"])
        repo = BookingAuditRepository()
        rows = repo.get_by_collection_mode("VISIT_LAB")
        self.assertGreaterEqual(len(rows), 1)

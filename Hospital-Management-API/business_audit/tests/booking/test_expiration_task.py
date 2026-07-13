"""Tests for expire_stale_bookings Celery task."""

from __future__ import annotations

from datetime import timedelta

from django.test import TestCase, override_settings
from django.utils import timezone

from business_audit.enums import BusinessAuditAction
from business_audit.models import BusinessAudit
from business_audit.tests.booking.support import create_booking_order, setup_booking_context
from diagnostics_engine.models.choices import OrderStatus
from diagnostics_engine.tasks import expire_stale_bookings
from labs.choices.workflow import AppointmentStatus
from labs.models import LabVisitAppointment
from shared.logging.context import get_context_manager


class ExpireStaleBookingsTaskTests(TestCase):
    def tearDown(self) -> None:
        get_context_manager().clear()

    @override_settings(BOOKING_CONFIRMATION_TIMEOUT_MINUTES=60)
    def test_expires_stale_created_orders(self) -> None:
        ctx = setup_booking_context()
        order = create_booking_order(ctx)
        order.status = OrderStatus.CREATED
        order.created_at = timezone.now() - timedelta(hours=2)
        order.save(update_fields=["status", "created_at"])
        with self.captureOnCommitCallbacks(execute=True):
            count = expire_stale_bookings()
        self.assertGreaterEqual(count, 1)
        self.assertTrue(
            BusinessAudit.objects.filter(
                resource_id=str(order.pk),
                action=BusinessAuditAction.BOOKING_EXPIRED,
            ).exists()
        )

    def test_expires_pending_visit_slot_timeout(self) -> None:
        ctx = setup_booking_context()
        order = create_booking_order(ctx)
        visit = LabVisitAppointment.objects.create(
            diagnostic_order=order,
            lab_branch=ctx["branch"],
            appointment_date=timezone.now().date() - timedelta(days=2),
            appointment_slot="09:00-10:00",
            status=AppointmentStatus.PENDING,
        )
        with self.captureOnCommitCallbacks(execute=True):
            count = expire_stale_bookings()
        self.assertGreaterEqual(count, 1)
        self.assertTrue(
            BusinessAudit.objects.filter(
                resource_id=str(order.pk),
                action=BusinessAuditAction.BOOKING_EXPIRED,
            ).exists()
        )
        visit.refresh_from_db()

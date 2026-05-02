"""Unit tests for booking_validation helpers (no DB required for mocks)."""

from unittest.mock import MagicMock

from django.test import SimpleTestCase

from appointments.utils.booking_validation import (
    MAX_BOOKING_DAYS,
    booking_error,
    err_future_limit_exceeded,
    err_slot_conflict,
    get_booking_source,
)


class BookingValidationHelpersTests(SimpleTestCase):
    def test_booking_error_shape(self):
        e = booking_error("SLOT_CONFLICT", "Slot already booked")
        self.assertEqual(e["code"], "SLOT_CONFLICT")
        self.assertEqual(e["message"], "Slot already booked")

    def test_err_slot_conflict(self):
        e = err_slot_conflict()
        self.assertEqual(e["code"], "SLOT_CONFLICT")

    def test_err_future_limit_exceeded(self):
        e = err_future_limit_exceeded(30)
        self.assertEqual(e["code"], "FUTURE_LIMIT_EXCEEDED")
        self.assertIn("30", e["message"])

    def test_max_booking_days_default(self):
        self.assertEqual(MAX_BOOKING_DAYS, 30)

    def test_get_booking_source_walk_in_when_helpdesk_group(self):
        user = MagicMock()
        user.groups.filter.return_value.exists.return_value = True
        self.assertEqual(get_booking_source(user), "walk_in")
        user.groups.filter.assert_called()

    def test_get_booking_source_online_when_not_helpdesk(self):
        user = MagicMock()
        user.groups.filter.return_value.exists.return_value = False
        self.assertEqual(get_booking_source(user), "online")

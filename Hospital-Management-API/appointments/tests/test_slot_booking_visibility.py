"""filter_same_day_past_slots — same-day lead buffer vs wall clock."""

from datetime import date, datetime, time
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone

from appointments.utils.slot_booking_visibility import filter_same_day_past_slots


class SlotBookingVisibilityTests(TestCase):
    def test_future_date_returns_all(self):
        d = date(2026, 6, 1)
        today = date(2026, 5, 3)
        slots = [{"start_time": time(9, 0), "end_time": time(9, 15)}]
        out = filter_same_day_past_slots(slots, d, today, lead_minutes=5)
        self.assertEqual(out, slots)

    @patch("appointments.utils.slot_booking_visibility.timezone.localtime")
    def test_today_keeps_only_after_cutoff(self, mock_localtime):
        tz = timezone.get_current_timezone()
        mock_localtime.return_value = timezone.make_aware(datetime(2026, 5, 3, 16, 21, 0), tz)
        today = date(2026, 5, 3)
        slots = [
            {"start_time": time(14, 0), "end_time": time(14, 15)},
            {"start_time": time(15, 0), "end_time": time(15, 15)},
            {"start_time": time(16, 30), "end_time": time(16, 45)},
        ]
        out = filter_same_day_past_slots(slots, today, today, lead_minutes=5)
        # cutoff 16:26 — only 16:30 start remains
        self.assertEqual(len(out), 1)
        self.assertEqual(out[0]["start_time"], time(16, 30))

"""Tests for slot grid helpers (no DB)."""

from datetime import date, time

from django.test import SimpleTestCase

from appointments.utils.slot_generation import (
    generate_slots,
    ordered_day_windows,
    parse_time_string,
    slot_bucket_counts,
)


class ParseTimeStringTests(SimpleTestCase):
    def test_hhmmss(self):
        self.assertEqual(parse_time_string("09:15:00"), time(9, 15, 0))

    def test_fractional_seconds_stripped(self):
        self.assertEqual(parse_time_string("09:15:00.000"), time(9, 15, 0))

    def test_hhmm(self):
        self.assertEqual(parse_time_string("09:15"), time(9, 15, 0))

    def test_empty(self):
        self.assertIsNone(parse_time_string(None))
        self.assertIsNone(parse_time_string(""))


class GenerateSlotsTests(SimpleTestCase):
    def test_15_minute_grid(self):
        d = date(2026, 5, 5)
        slots = generate_slots(d, time(9, 0), time(9, 45), 15, 0)
        self.assertEqual(len(slots), 3)
        self.assertEqual(slots[0]["start_time"], time(9, 0))
        self.assertEqual(slots[0]["end_time"], time(9, 15))
        self.assertEqual(slots[2]["end_time"], time(9, 45))

    def test_buffer_skips_gap(self):
        d = date(2026, 5, 5)
        slots = generate_slots(d, time(9, 0), time(9, 40), 15, 5)
        # 09:00-09:15, gap 5m -> next 09:20-09:35; next would end 09:50 > 09:40
        self.assertEqual(len(slots), 2)

    def test_invalid_window(self):
        d = date(2026, 5, 5)
        self.assertEqual(generate_slots(d, time(18, 0), time(9, 0), 15, 0), [])


class OrderedDayWindowsTests(SimpleTestCase):
    def test_flat_keys(self):
        day = {
            "day": "monday",
            "morning_start": "09:00:00",
            "morning_end": "12:00:00",
            "afternoon_start": "14:00:00",
            "afternoon_end": "17:00:00",
        }
        wins = ordered_day_windows(day)
        self.assertEqual(wins[0], ("09:00:00", "12:00:00"))
        self.assertEqual(wins[1], ("14:00:00", "17:00:00"))


class BucketSummaryTests(SimpleTestCase):
    def test_buckets(self):
        s = slot_bucket_counts([time(10, 0), time(14, 0), time(18, 0)])
        self.assertEqual(s["morning"], 1)
        self.assertEqual(s["afternoon"], 1)
        self.assertEqual(s["evening"], 1)

"""Unit tests for BookingSnapshotBuilder."""

from __future__ import annotations

import uuid

from django.test import TestCase

from business_audit.booking.snapshot_builder import BookingSnapshotBuilder


class BookingSnapshotBuilderTests(TestCase):
    def test_modified_state(self) -> None:
        before = {"slot": {"date": "2026-07-10", "time": "09:00"}}
        after = {"slot": {"date": "2026-07-12", "time": "11:00"}}
        snapshot = BookingSnapshotBuilder.modified_state(
            before=before,
            after=after,
            reason="slot_reschedule",
        )
        self.assertEqual(snapshot["reason"], "slot_reschedule")
        self.assertEqual(snapshot["before"], before)
        self.assertEqual(snapshot["after"], after)

    def test_cancelled_state(self) -> None:
        snapshot = BookingSnapshotBuilder.cancelled_state(
            prior_status="confirmed",
            cancellation_reason="Patient requested",
            cancelled_by_id=str(uuid.uuid4()),
        )
        self.assertEqual(snapshot["prior_status"], "confirmed")
        self.assertEqual(snapshot["cancellation_reason"], "Patient requested")

    def test_slot_snapshot(self) -> None:
        from datetime import date

        snap = BookingSnapshotBuilder.slot_snapshot(date=date(2026, 7, 10), slot="09:00-10:00")
        self.assertEqual(snap["slot"]["date"], "2026-07-10")
        self.assertEqual(snap["slot"]["time"], "09:00-10:00")

    def test_lifecycle_state(self) -> None:
        before, after = BookingSnapshotBuilder.lifecycle_state(
            state_before="Confirmed",
            state_after="Modified",
        )
        self.assertEqual(before, "Confirmed")
        self.assertEqual(after, "Modified")

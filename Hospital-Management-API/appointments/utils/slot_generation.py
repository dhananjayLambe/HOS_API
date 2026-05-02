"""Reusable slot grid generation from working-hour windows (DoctorAvailability-style)."""

from __future__ import annotations

from datetime import date, datetime, time, timedelta
from typing import Any, Dict, List, Optional, Tuple

from django.utils import timezone


def parse_time_string(value: Optional[str]) -> Optional[time]:
    """Parse 'HH:MM' or 'HH:MM:SS'; return None if missing or invalid."""
    if value is None or value == "":
        return None
    if not isinstance(value, str):
        return None
    s = value.strip()
    # Strip fractional seconds if present (e.g. "09:15:00.000")
    if "." in s and ":" in s:
        s = s.split(".", 1)[0].strip()
    for fmt in ("%H:%M:%S", "%H:%M"):
        try:
            return datetime.strptime(s, fmt).time()
        except ValueError:
            continue
    return None


def generate_slots(
    day: date,
    window_start: time,
    window_end: time,
    duration_minutes: int,
    buffer_minutes: int = 0,
) -> List[Dict[str, time]]:
    """
    Build contiguous slots within [window_start, window_end).

    Each item: {"start_time": time, "end_time": time}.
    """
    if duration_minutes <= 0:
        return []

    tz = timezone.get_current_timezone()
    start_dt = timezone.make_aware(datetime.combine(day, window_start), tz)
    end_dt = timezone.make_aware(datetime.combine(day, window_end), tz)
    if start_dt >= end_dt:
        return []

    slots: List[Dict[str, time]] = []
    current = start_dt
    delta_slot = timedelta(minutes=duration_minutes)
    delta_buf = timedelta(minutes=buffer_minutes)

    while current + delta_slot <= end_dt:
        slot_end = current + delta_slot
        slots.append({"start_time": current.time(), "end_time": slot_end.time()})
        current = slot_end + delta_buf

    return slots


def extract_period_window(day_entry: dict, period: str) -> Tuple[Optional[str], Optional[str]]:
    """Return (start_str, end_str) for morning | afternoon | evening | night (nested or flat JSON)."""
    if period == "morning":
        if isinstance(day_entry.get("morning"), dict):
            m = day_entry["morning"]
            return m.get("start"), m.get("end")
        return day_entry.get("morning_start"), day_entry.get("morning_end")
    if period == "afternoon":
        if isinstance(day_entry.get("afternoon"), dict):
            m = day_entry["afternoon"]
            return m.get("start"), m.get("end")
        return day_entry.get("afternoon_start"), day_entry.get("afternoon_end")
    if period == "evening":
        if isinstance(day_entry.get("evening"), dict):
            m = day_entry["evening"]
            return m.get("start"), m.get("end")
        return day_entry.get("evening_start"), day_entry.get("evening_end")
    if period == "night":
        if isinstance(day_entry.get("night"), dict):
            m = day_entry["night"]
            return m.get("start"), m.get("end")
        return day_entry.get("night_start"), day_entry.get("night_end")
    return None, None


def ordered_day_windows(day_entry: dict) -> List[Tuple[Optional[str], Optional[str]]]:
    """Windows in display order: morning → afternoon → evening → night."""
    order = ("morning", "afternoon", "evening", "night")
    return [extract_period_window(day_entry, p) for p in order]


def slot_bucket_counts(slot_starts: List[time]) -> Dict[str, int]:
    """
    Bucket counts for UI tabs: morning (before 12:00), afternoon 12:00–16:59,
    evening 17:00+ (including after 21:59).
    """
    summary = {"morning": 0, "afternoon": 0, "evening": 0}
    for t in slot_starts:
        minutes = t.hour * 60 + t.minute
        if minutes < 12 * 60:
            summary["morning"] += 1
        elif 12 * 60 <= minutes < 17 * 60:
            summary["afternoon"] += 1
        else:
            summary["evening"] += 1
    return summary


def format_slot_time(t: time) -> str:
    return t.strftime("%H:%M:%S")

"""Shared date preset parsing for lab dashboard list APIs."""

from __future__ import annotations

from datetime import date, timedelta

from django.utils import timezone


def date_range_from_preset(preset: str | None) -> tuple[date | None, date | None]:
    if not preset:
        return None, None
    today = timezone.localdate()
    preset = preset.strip().lower()
    if preset == "today":
        return today, today
    if preset == "tomorrow":
        t = today + timedelta(days=1)
        return t, t
    if preset in ("week", "this_week"):
        start = today - timedelta(days=today.weekday())
        return start, start + timedelta(days=6)
    return None, None


def parse_date_param(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None

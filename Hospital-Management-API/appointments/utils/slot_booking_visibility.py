"""Same-day slot visibility: hide times that are no longer bookable in real time."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List

from django.utils import timezone


def filter_same_day_past_slots(
    flat_slots: List[Dict[str, Any]],
    target_date,
    today,
    lead_minutes: int,
) -> List[Dict[str, Any]]:
    """
    For target_date == today, drop slots whose start is not strictly after
    local now + lead_minutes. Other dates are returned unchanged.
    """
    if target_date != today:
        return flat_slots
    lead = max(0, int(lead_minutes))
    cutoff = timezone.localtime() + timedelta(minutes=lead)
    tz = timezone.get_current_timezone()
    out: List[Dict[str, Any]] = []
    for slot in flat_slots:
        st = slot["start_time"]
        slot_start = timezone.make_aware(datetime.combine(target_date, st), tz)
        if slot_start > cutoff:
            out.append(slot)
    return out

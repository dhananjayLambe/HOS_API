"""
Helpdesk appointment list: section filters and search Q objects.

Keeps datetime edge cases (e.g. +2h crossing midnight) explicit.
"""

import re
from datetime import timedelta

from django.db.models import Q


def normalize_search(raw: str | None) -> str:
    if not raw:
        return ""
    return " ".join(str(raw).strip().split())


def build_appointment_search_q(term: str) -> Q:
    """
    Partial case-insensitive name match; mobile via username; last-4 digits.
    """
    term = normalize_search(term)
    if not term:
        return Q()

    q = (
        Q(patient_profile__first_name__icontains=term)
        | Q(patient_profile__last_name__icontains=term)
        | Q(patient_profile__public_id__icontains=term)
    )
    digits_only = re.sub(r"\D", "", term)
    if digits_only:
        q |= Q(patient_account__user__username__icontains=digits_only)
    if len(digits_only) >= 4:
        q |= Q(patient_account__user__username__endswith=digits_only[-4:])
    return q


def primary_section_q(today, now_dt) -> Q:
    """Operational primary: in-flow today, or today's scheduled within the next ~2h window (incl. overdue)."""
    cutoff_dt = now_dt + timedelta(hours=2)
    active_today = Q(
        appointment_date=today,
        status__in=("checked_in", "in_consultation"),
    )
    if cutoff_dt.date() == today:
        scheduled_today = Q(
            appointment_date=today,
            status="scheduled",
            slot_start_time__lte=cutoff_dt.time(),
        )
    else:
        # Window crosses calendar day: entire remaining day counts as primary for scheduled.
        scheduled_today = Q(appointment_date=today, status="scheduled")
    return active_today | scheduled_today


def secondary_section_q(today, now_dt) -> Q:
    """Scheduled appointments not covered by primary (later today or future days)."""
    cutoff_dt = now_dt + timedelta(hours=2)
    future_days = Q(appointment_date__gt=today, status="scheduled")
    if cutoff_dt.date() == today:
        later_today = Q(
            appointment_date=today,
            status="scheduled",
            slot_start_time__gt=cutoff_dt.time(),
        )
        return future_days | later_today
    # After midnight spill: today's scheduled are all primary-eligible; secondary is future dates only.
    return future_days


def archive_section_q(today) -> Q:
    start = today - timedelta(days=7)
    return Q(status__in=("completed", "cancelled", "no_show")) & Q(appointment_date__gte=start)

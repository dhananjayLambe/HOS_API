from __future__ import annotations

from datetime import date, timedelta


def get_previous_period(start_date: date, end_date: date) -> tuple[date, date]:
    period_days = max((end_date - start_date).days + 1, 1)
    previous_end = start_date - timedelta(days=1)
    previous_start = previous_end - timedelta(days=period_days - 1)
    return previous_start, previous_end


def iter_date_range(start_date: date, end_date: date):
    current = start_date
    while current <= end_date:
        yield current
        current += timedelta(days=1)

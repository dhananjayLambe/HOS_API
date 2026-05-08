from __future__ import annotations

from datetime import timedelta

from reports.constants.report_constants import DAILY_TRENDS_DAYS, MONTHLY_TRENDS_MONTHS
from reports.selectors.appointment_report_selectors import daily_status_counts, monthly_totals
from reports.utils.date_utils import iter_date_range


def build_daily_trends(base_queryset, end_date):
    start_date = end_date - timedelta(days=DAILY_TRENDS_DAYS - 1)
    queryset = base_queryset.filter(appointment_date__range=(start_date, end_date))
    grouped = daily_status_counts(queryset)

    trends = []
    for day in iter_date_range(start_date, end_date):
        daily = grouped.get(day, {})
        trends.append(
            {
                "date": day.isoformat(),
                "total": daily.get("total", 0),
                "completed": daily.get("completed", 0),
                "cancelled": daily.get("cancelled", 0),
                "no_show": daily.get("no_show", 0),
            }
        )
    return trends


def build_monthly_trends(base_queryset, end_date):
    month_anchor = end_date.replace(day=1)
    earliest_month = (month_anchor - timedelta(days=1)).replace(day=1)
    for _ in range(MONTHLY_TRENDS_MONTHS - 2):
        earliest_month = (earliest_month - timedelta(days=1)).replace(day=1)

    queryset = base_queryset.filter(appointment_date__gte=earliest_month)
    raw = monthly_totals(queryset)
    totals_map = {}
    for row in raw:
        month_value = row["month"]
        month_date = month_value.date() if hasattr(month_value, "date") else month_value
        totals_map[month_date] = row["appointments"]

    out = []
    current = earliest_month
    for _ in range(MONTHLY_TRENDS_MONTHS):
        out.append(
            {
                "month": current.strftime("%b"),
                "appointments": totals_map.get(current, 0),
            }
        )
        current = (current + timedelta(days=32)).replace(day=1)
    return out

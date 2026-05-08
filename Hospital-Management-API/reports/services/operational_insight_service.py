from __future__ import annotations

from reports.constants.report_constants import INSIGHT_THRESHOLDS


def build_performance_insights(*, patient_split, summary, peak_hours):
    performing_well = []
    needs_attention = []

    retention_percentage = patient_split["retention_percentage"]
    completion_count = summary["completed"]["count"]
    total_count = summary["total_appointments"]["count"]
    completion_rate = round((completion_count / total_count) * 100, 2) if total_count else 0.0
    no_show_rate = round((summary["no_show"]["count"] / total_count) * 100, 2) if total_count else 0.0
    cancellation_change = summary["cancelled"]["change_percentage"]

    if retention_percentage > INSIGHT_THRESHOLDS["retention_positive"]:
        performing_well.append(
            {
                "title": "Returning patient retention remains strong",
                "value": f"{retention_percentage}%",
                "trend": "positive",
            }
        )
    if completion_rate > INSIGHT_THRESHOLDS["completion_positive"]:
        performing_well.append(
            {
                "title": "Appointment completion rate is above target",
                "value": f"{completion_rate}%",
                "trend": "positive",
            }
        )

    if no_show_rate > INSIGHT_THRESHOLDS["no_show_warning"]:
        needs_attention.append(
            {
                "title": "No-show appointments are above threshold",
                "value": f"{no_show_rate}%",
                "trend": "warning",
            }
        )

    if cancellation_change > 0:
        needs_attention.append(
            {
                "title": "Cancellation rate is increasing compared to previous period",
                "value": f"+{cancellation_change}%",
                "trend": "warning",
            }
        )

    if peak_hours:
        max_peak = max(peak_hours, key=lambda item: item["count"])
        if max_peak["count"] > INSIGHT_THRESHOLDS["peak_hour_attention_count"]:
            needs_attention.append(
                {
                    "title": f"Peak load in {max_peak['slot']} may need extra support staff",
                    "value": str(max_peak["count"]),
                    "trend": "warning",
                }
            )

    if not performing_well:
        performing_well.append(
            {
                "title": "Operational stability maintained for selected period",
                "value": f"{total_count}",
                "trend": "positive",
            }
        )
    if not needs_attention:
        needs_attention.append(
            {
                "title": "No major operational alerts detected",
                "value": "0",
                "trend": "stable",
            }
        )

    return {
        "performing_well": performing_well,
        "needs_attention": needs_attention,
    }

"""Timeline constants."""

from __future__ import annotations

from support_trace.timeline.enums import TimelineCategory

TIMELINE_EVENT_NAMESPACE = "a3f2c8e1-5b4d-4e9a-8c7d-1f2e3d4c5b6a"

CATEGORY_SORT_PRIORITY: dict[str, int] = {
    TimelineCategory.CLINICAL: 0,
    TimelineCategory.BUSINESS: 1,
    TimelineCategory.WORKFLOW: 2,
    TimelineCategory.DECISION: 3,
    TimelineCategory.COMMUNICATION: 4,
    TimelineCategory.SYSTEM: 5,
    TimelineCategory.SECURITY: 6,
}

CERTIFICATION_REQUIRED_ACTIONS: frozenset[str] = frozenset(
    {
        "consultation.started",
        "consultation.completed",
        "recommendation.generated",
        "booking.created",
        "booking.confirmed",
        "routing.started",
        "routing.lab_assigned",
        "routing.failed",
        "report.delivery_requested",
    }
)

TERMINAL_WORKFLOW_STATUSES = frozenset({"Completed", "Failed", "Cancelled", "Expired"})
ACTIVE_WORKFLOW_STATUSES = frozenset({"Started", "Running", "Waiting"})

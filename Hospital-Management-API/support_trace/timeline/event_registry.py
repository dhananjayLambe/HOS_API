"""Event display registry — UI-config-driven titles, severity, tags."""

from __future__ import annotations

from dataclasses import dataclass

from support_trace.timeline.enums import TimelineCategory, TimelineSeverity


@dataclass(frozen=True)
class EventDisplaySpec:
    title: str
    category: str
    severity: str
    default_summary: str
    tags: tuple[str, ...] = ()
    icon: str | None = None
    color: str | None = None


def _spec(
    title: str,
    category: str,
    severity: str,
    summary: str,
    *,
    tags: tuple[str, ...] = (),
    icon: str | None = None,
    color: str | None = None,
) -> EventDisplaySpec:
    return EventDisplaySpec(
        title=title,
        category=category,
        severity=severity,
        default_summary=summary,
        tags=tags,
        icon=icon,
        color=color,
    )


EVENT_REGISTRY: dict[str, EventDisplaySpec] = {
    "consultation.started": _spec(
        "Consultation Started",
        TimelineCategory.CLINICAL,
        TimelineSeverity.INFO,
        "Clinical consultation session started",
        tags=("consultation", "clinical"),
        icon="stethoscope",
        color="blue",
    ),
    "consultation.completed": _spec(
        "Consultation Completed",
        TimelineCategory.CLINICAL,
        TimelineSeverity.INFO,
        "Clinical consultation completed",
        tags=("consultation", "clinical"),
    ),
    "consultation.findings.updated": _spec(
        "Symptoms Recorded",
        TimelineCategory.CLINICAL,
        TimelineSeverity.INFO,
        "Consultation findings updated",
        tags=("consultation", "clinical", "findings"),
    ),
    "diagnosis.added": _spec(
        "Diagnosis Added",
        TimelineCategory.CLINICAL,
        TimelineSeverity.INFO,
        "Diagnosis recorded",
        tags=("consultation", "diagnosis"),
    ),
    "prescription.signed": _spec(
        "Prescription Signed",
        TimelineCategory.CLINICAL,
        TimelineSeverity.INFO,
        "Prescription signed by clinician",
        tags=("prescription", "clinical"),
    ),
    "report.viewed": _spec(
        "Report Viewed",
        TimelineCategory.CLINICAL,
        TimelineSeverity.INFO,
        "Diagnostic report viewed",
        tags=("report", "clinical"),
    ),
    "recommendation.generated": _spec(
        "Recommendation Generated",
        TimelineCategory.BUSINESS,
        TimelineSeverity.INFO,
        "Marketplace recommendation generated",
        tags=("recommendation",),
        icon="recommendation",
        color="purple",
    ),
    "recommendation.failed": _spec(
        "Recommendation Failed",
        TimelineCategory.BUSINESS,
        TimelineSeverity.ERROR,
        "Recommendation delivery failed",
        tags=("recommendation", "retry"),
        color="red",
    ),
    "booking.created": _spec(
        "Booking Created",
        TimelineCategory.BUSINESS,
        TimelineSeverity.INFO,
        "Diagnostic booking created",
        tags=("booking",),
        icon="calendar",
        color="green",
    ),
    "booking.confirmed": _spec(
        "Booking Confirmed",
        TimelineCategory.BUSINESS,
        TimelineSeverity.INFO,
        "Booking confirmed",
        tags=("booking",),
    ),
    "routing.started": _spec(
        "Routing Started",
        TimelineCategory.DECISION,
        TimelineSeverity.INFO,
        "Lab routing decision started",
        tags=("routing", "decision"),
    ),
    "routing.lab_assigned": _spec(
        "Lab Assigned",
        TimelineCategory.DECISION,
        TimelineSeverity.INFO,
        "Laboratory assigned to booking",
        tags=("routing", "laboratory"),
    ),
    "routing.failed": _spec(
        "Routing Failed",
        TimelineCategory.DECISION,
        TimelineSeverity.CRITICAL,
        "Lab routing failed",
        tags=("routing", "retry"),
        color="red",
    ),
    "report.delivery_requested": _spec(
        "Delivery Requested",
        TimelineCategory.COMMUNICATION,
        TimelineSeverity.INFO,
        "Report delivery requested",
        tags=("report", "communication"),
    ),
    "report.delivery_requested": _spec(
        "Delivery Requested",
        TimelineCategory.COMMUNICATION,
        TimelineSeverity.INFO,
        "Report delivery requested",
        tags=("report", "communication"),
    ),
    "report.whatsapp_delivery": _spec(
        "WhatsApp Sent",
        TimelineCategory.COMMUNICATION,
        TimelineSeverity.INFO,
        "Report delivered via WhatsApp",
        tags=("whatsapp", "communication", "report"),
        icon="whatsapp",
        color="green",
    ),
    "workflow.failed": _spec(
        "Workflow Failed",
        TimelineCategory.WORKFLOW,
        TimelineSeverity.ERROR,
        "Workflow execution failed",
        tags=("workflow", "retry"),
    ),
    "workflow.retrying": _spec(
        "Workflow Retrying",
        TimelineCategory.WORKFLOW,
        TimelineSeverity.WARNING,
        "Workflow retry in progress",
        tags=("workflow", "retry"),
    ),
}


class EventRegistry:
    @classmethod
    def get(cls, action: str | None) -> EventDisplaySpec | None:
        if not action:
            return None
        return EVENT_REGISTRY.get(str(action).strip())

    @classmethod
    def resolve(
        cls,
        action: str | None,
        *,
        fallback_event: str,
        fallback_category: str,
    ) -> EventDisplaySpec:
        spec = cls.get(action)
        if spec is not None:
            return spec
        return EventDisplaySpec(
            title=fallback_event or "Event",
            category=fallback_category,
            severity=TimelineSeverity.INFO,
            default_summary=fallback_event or "Event recorded",
            tags=(),
        )

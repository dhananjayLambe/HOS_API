"""Presentation helpers for visit appointment list rows."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta

from django.utils import timezone

from labs.api.services.lab_orders_presenter import patient_gender_display
from labs.services.visit_workflow import allowed_actions_for_status, workflow_hint_for_status

EVENT_DISPLAY_LABELS: dict[str, str] = {
    "confirmed": "Appointment confirmed",
    "checked_in": "Patient checked in",
    "completed": "Appointment completed",
    "no_show": "Patient did not arrive",
    "rescheduled": "Appointment rescheduled",
    "pending": "Appointment scheduled",
}

_PREP_KEYWORD_TAGS: tuple[tuple[str, str], ...] = (
    ("fasting", "Fasting"),
    ("contrast", "Contrast"),
    ("metallic", "MRI Metal Restriction"),
    ("metal restriction", "MRI Metal Restriction"),
)

_LEGACY_AUDIT_TIMELINE_FIELDS: tuple[tuple[str, str], ...] = (
    ("confirmed_at", "confirmed"),
    ("checked_in_at", "checked_in"),
    ("completed_at", "completed"),
    ("no_show_at", "no_show"),
)


@dataclass(frozen=True)
class VisitTimelineEventDTO:
    event: str
    raw_event: str
    timestamp: str
    label: str
    detail: str
    event_order: int


@dataclass(frozen=True)
class VisitAppointmentListRowDTO:
    id: str
    appointment_id: str
    order_number: str
    order_uuid: str
    patient_name: str
    patient_phone: str
    patient_age: int | None
    patient_gender: str
    test_count: int
    test_names: list[str]
    test_names_overflow: int
    appointment_date: date
    appointment_slot: str
    slot_date_label: str
    slot_time_label: str
    fasting_required: bool
    prep_tags: list[str]
    prep_summary: str
    instructions: str
    appointment_status: str
    workflow_hint: str
    allowed_actions: list[str]
    patient_notes: str | None
    status_updated_at: datetime
    confirmed_at: datetime | None
    checked_in_at: datetime | None
    completed_at: datetime | None
    no_show_at: datetime | None
    cancelled_at: datetime | None
    timeline_events: list[VisitTimelineEventDTO]


def relative_appointment_date_label(d: date) -> str:
    today = timezone.localdate()
    if d == today:
        return "Today"
    if d == today + timedelta(days=1):
        return "Tomorrow"
    if d == today - timedelta(days=1):
        return "Yesterday"
    return d.strftime("%d %b %Y")


def display_appointment_id(visit) -> str:
    meta = visit.metadata or {}
    if meta.get("appointment_display_id"):
        return str(meta["appointment_display_id"])
    short = str(visit.id).replace("-", "")[:8].upper()
    return f"APT-{short}"


def _humanize_event_key(raw_event: str) -> str:
    normalized = (raw_event or "").strip().replace("-", "_")
    if not normalized:
        return "Workflow update"
    return normalized.replace("_", " ").title()


def event_display_label(raw_event: str) -> str:
    key = (raw_event or "").strip().lower().replace("-", "_")
    return EVENT_DISPLAY_LABELS.get(key, _humanize_event_key(raw_event))


def format_prep_tags(
    instructions: str,
    *,
    metadata_tags: list[str] | None = None,
) -> list[str]:
    tags: list[str] = []
    seen: set[str] = set()

    def add_tag(label: str) -> None:
        cleaned = (label or "").strip()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            tags.append(cleaned)

    for tag in metadata_tags or []:
        add_tag(str(tag))

    text = (instructions or "").strip()
    if text:
        lower = text.lower()
        for keyword, label in _PREP_KEYWORD_TAGS:
            if keyword in lower:
                add_tag(label)

    if not tags and text:
        add_tag(text[:80] if len(text) <= 80 else f"{text[:77]}...")

    return tags


def format_prep_summary(prep_tags: list[str], instructions: str) -> str:
    if prep_tags:
        return " · ".join(prep_tags)
    text = (instructions or "").strip()
    if not text:
        return ""
    if len(text) <= 80:
        return text
    return f"{text[:77]}..."


def _iso_timestamp(value: datetime | str | None) -> str:
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def _timeline_detail_from_raw(entry: dict) -> str:
    parts: list[str] = []
    reason = (entry.get("reason") or "").strip()
    if reason:
        parts.append(reason)
    appt_date = entry.get("appointment_date")
    appt_slot = (entry.get("appointment_slot") or "").strip()
    if appt_date:
        slot_part = f"{appt_date} {appt_slot}".strip()
        parts.append(f"Rescheduled to {slot_part}")
    elif appt_slot:
        parts.append(f"Slot: {appt_slot}")
    return " · ".join(parts)


def _timeline_candidates_from_metadata(visit) -> list[tuple[str, str, str, str]]:
    metadata = visit.metadata or {}
    raw_events = metadata.get("workflow_events") or []
    candidates: list[tuple[str, str, str, str]] = []
    for entry in raw_events:
        if not isinstance(entry, dict):
            continue
        raw_event = (entry.get("event") or "").strip()
        timestamp = (entry.get("timestamp") or "").strip()
        if not raw_event or not timestamp:
            continue
        event_key = raw_event.lower().replace("-", "_")
        candidates.append((event_key, raw_event, timestamp, _timeline_detail_from_raw(entry)))
    return candidates


def _timeline_candidates_from_audit(visit) -> list[tuple[str, str, str, str]]:
    candidates: list[tuple[str, str, str, str]] = []
    for field_name, event_key in _LEGACY_AUDIT_TIMELINE_FIELDS:
        dt = getattr(visit, field_name, None)
        if not dt:
            continue
        candidates.append((event_key, event_key, _iso_timestamp(dt), ""))
    return candidates


def _assign_event_order(
    candidates: list[tuple[str, str, str, str]],
) -> list[VisitTimelineEventDTO]:
    if not candidates:
        return []

    sorted_candidates = sorted(candidates, key=lambda row: row[2])

    result: list[VisitTimelineEventDTO] = []
    for order, (event_key, raw_event, timestamp, detail) in enumerate(sorted_candidates):
        result.append(
            VisitTimelineEventDTO(
                event=event_key,
                raw_event=raw_event,
                timestamp=timestamp,
                label=event_display_label(raw_event),
                detail=detail,
                event_order=order,
            ),
        )

    return list(reversed(result))


def format_timeline_events(visit) -> list[VisitTimelineEventDTO]:
    candidates = _timeline_candidates_from_metadata(visit)
    if not candidates:
        candidates = _timeline_candidates_from_audit(visit)
    return _assign_event_order(candidates)


def build_visit_appointment_row_dto(visit) -> VisitAppointmentListRowDTO:
    order = visit.diagnostic_order
    profile = order.patient_profile
    user = profile.account.user if profile and profile.account_id else None
    test_lines = list(order.test_lines.all())
    test_names = [tl.service.name for tl in test_lines if tl.service_id]
    display_names = test_names[:2]
    overflow = max(0, len(test_names) - len(display_names))

    phone = ""
    if user:
        phone = (user.username or "").strip()

    meta = visit.metadata or {}
    metadata_prep_tags = meta.get("prep_tags")
    if isinstance(metadata_prep_tags, list):
        prep_tag_source = [str(t) for t in metadata_prep_tags]
    else:
        prep_tag_source = None

    instructions = (visit.instructions or "").strip()
    prep_tags = format_prep_tags(instructions, metadata_tags=prep_tag_source)
    fasting_required = "fasting" in instructions.lower() or any(
        t.lower() == "fasting" for t in prep_tags
    )
    prep_summary = format_prep_summary(prep_tags, instructions)
    status = visit.status
    status_updated = visit.status_changed_at or visit.updated_at

    return VisitAppointmentListRowDTO(
        id=str(visit.id),
        appointment_id=display_appointment_id(visit),
        order_number=order.order_number,
        order_uuid=str(order.id),
        patient_name=profile.get_full_name() if profile else "",
        patient_phone=phone,
        patient_age=profile.age if profile else None,
        patient_gender=patient_gender_display(profile),
        test_count=len(test_names),
        test_names=display_names,
        test_names_overflow=overflow,
        appointment_date=visit.appointment_date,
        appointment_slot=visit.appointment_slot or "",
        slot_date_label=relative_appointment_date_label(visit.appointment_date),
        slot_time_label=visit.appointment_slot or "—",
        fasting_required=fasting_required,
        prep_tags=prep_tags,
        prep_summary=prep_summary,
        instructions=instructions,
        appointment_status=status,
        workflow_hint=workflow_hint_for_status(status),
        allowed_actions=allowed_actions_for_status(status),
        patient_notes=visit.patient_notes,
        status_updated_at=status_updated,
        confirmed_at=visit.confirmed_at,
        checked_in_at=visit.checked_in_at,
        completed_at=visit.completed_at,
        no_show_at=visit.no_show_at,
        cancelled_at=visit.cancelled_at,
        timeline_events=format_timeline_events(visit),
    )

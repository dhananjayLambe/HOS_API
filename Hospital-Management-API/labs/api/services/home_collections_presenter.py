"""Presentation helpers for home collections list rows."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta

from django.utils import timezone

from labs.api.services.lab_orders_presenter import format_address_snapshot, patient_gender_display
from labs.choices.workflow import CollectionStatus, LabAssignmentStatus
from labs.services.collection_workflow import allowed_actions_for_status, workflow_hint_for_status


@dataclass(frozen=True)
class HomeCollectionListRowDTO:
    id: str
    order_number: str
    order_uuid: str
    assignment_id: str | None
    patient_name: str
    patient_phone: str
    patient_age: int | None
    patient_gender: str
    test_count: int
    test_names: list[str]
    test_names_overflow: int
    preferred_date: date
    preferred_slot: str
    confirmed_date: date | None
    confirmed_slot: str | None
    slot_date_label: str
    slot_time_label: str
    assigned_phlebotomist_id: str | None
    assigned_phlebotomist_name: str | None
    assignment_note: str
    collection_status: str
    workflow_hint: str
    allowed_actions: list[str]
    address_snapshot: dict
    address_formatted: str
    patient_notes: str | None
    internal_notes: str | None
    assigned_at: datetime | None
    in_progress_at: datetime | None
    collected_at: datetime | None
    failed_at: datetime | None
    retry_count: int
    collection_type: str


def _relative_date_label(d: date) -> str:
    today = timezone.localdate()
    if d == today:
        return "Today"
    if d == today + timedelta(days=1):
        return "Tomorrow"
    if d == today - timedelta(days=1):
        return "Yesterday"
    return d.strftime("%d %b %Y")


def _phlebotomist_display(lab_user) -> str:
    if lab_user is None:
        return ""
    user = getattr(lab_user, "user", None)
    if user is None:
        return ""
    full = user.get_full_name()
    return full.strip() or user.username


def build_home_collection_row_dto(collection) -> HomeCollectionListRowDTO:
    order = collection.diagnostic_order
    profile = order.patient_profile
    user = profile.account.user if profile and profile.account_id else None
    test_lines = list(order.test_lines.all())
    test_names = [tl.service.name for tl in test_lines if tl.service_id]
    display_names = test_names[:2]
    overflow = max(0, len(test_names) - len(display_names))

    slot_date = collection.confirmed_date or collection.preferred_date
    slot_time = collection.confirmed_slot or collection.preferred_slot

    assignment = getattr(order, "lab_assignment", None)
    assignment_id = str(assignment.id) if assignment else None

    status = collection.collection_status

    return HomeCollectionListRowDTO(
        id=str(collection.id),
        order_number=order.order_number,
        order_uuid=str(order.id),
        assignment_id=assignment_id,
        patient_name=profile.get_full_name() if profile else "",
        patient_phone=getattr(user, "username", "") or "",
        patient_age=profile.age if profile else None,
        patient_gender=patient_gender_display(profile),
        test_count=len(test_names),
        test_names=display_names,
        test_names_overflow=overflow,
        preferred_date=collection.preferred_date,
        preferred_slot=collection.preferred_slot,
        confirmed_date=collection.confirmed_date,
        confirmed_slot=collection.confirmed_slot,
        slot_date_label=_relative_date_label(slot_date),
        slot_time_label=slot_time or "—",
        assigned_phlebotomist_id=(
            str(collection.assigned_phlebotomist_id)
            if collection.assigned_phlebotomist_id
            else None
        ),
        assigned_phlebotomist_name=_phlebotomist_display(collection.assigned_phlebotomist) or None,
        assignment_note=(collection.assignment_note or "").strip(),
        collection_status=status,
        workflow_hint=workflow_hint_for_status(status),
        allowed_actions=allowed_actions_for_status(status),
        address_snapshot=collection.address_snapshot or {},
        address_formatted=format_address_snapshot(collection.address_snapshot),
        patient_notes=collection.patient_notes,
        internal_notes=collection.internal_notes,
        assigned_at=collection.assigned_at,
        in_progress_at=collection.in_progress_at,
        collected_at=collection.collected_at,
        failed_at=collection.failed_at,
        retry_count=collection.retry_count or 0,
        collection_type=collection.collection_type or "HOME",
    )


def assignment_status_allows_queue(assignment) -> bool:
    if assignment is None:
        return False
    return assignment.status in (
        LabAssignmentStatus.ACCEPTED,
        LabAssignmentStatus.IN_PROGRESS,
    )

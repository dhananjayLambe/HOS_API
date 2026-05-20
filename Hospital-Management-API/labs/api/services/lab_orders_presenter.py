"""Pure presentation helpers for lab orders list rows."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from django.utils import timezone

from consultations_core.models.investigation import InvestigationItem, InvestigationUrgency
from diagnostics_engine.domain.reports import get_active_report_for_line
from diagnostics_engine.models.choices import ReportLifecycleStatus
from labs.choices.tracking import SampleStatus


API_URGENCY_STAT = "STAT"
API_URGENCY_URGENT = "URGENT"
API_URGENCY_ROUTINE = "ROUTINE"

_URGENCY_RANK = {
    InvestigationUrgency.ROUTINE: 0,
    InvestigationUrgency.URGENT: 1,
    InvestigationUrgency.STAT: 2,
}

_API_FROM_INVESTIGATION = {
    InvestigationUrgency.ROUTINE: API_URGENCY_ROUTINE,
    InvestigationUrgency.URGENT: API_URGENCY_URGENT,
    InvestigationUrgency.STAT: API_URGENCY_STAT,
}

_SAMPLE_RANK = {
    SampleStatus.COLLECTED: 1,
    SampleStatus.IN_TRANSIT: 2,
    SampleStatus.RECEIVED: 3,
    SampleStatus.PROCESSING: 4,
    SampleStatus.COMPLETED: 5,
    SampleStatus.REJECTED: 0,
}

_REPORT_RANK = {
    ReportLifecycleStatus.PENDING: 1,
    ReportLifecycleStatus.IN_PROGRESS: 2,
    ReportLifecycleStatus.READY: 3,
    ReportLifecycleStatus.DELIVERED: 4,
    ReportLifecycleStatus.REJECTED: 0,
}


def api_urgency_from_investigation(value: str | None) -> str:
    if not value:
        return API_URGENCY_ROUTINE
    return _API_FROM_INVESTIGATION.get(value, API_URGENCY_ROUTINE)


def investigation_urgency_for_filter(api_urgency: str) -> str | None:
    mapping = {
        API_URGENCY_STAT: InvestigationUrgency.STAT,
        API_URGENCY_URGENT: InvestigationUrgency.URGENT,
        API_URGENCY_ROUTINE: InvestigationUrgency.ROUTINE,
    }
    return mapping.get(api_urgency.upper()) if api_urgency else None


def collection_type_from_mode(mode: str | None) -> str:
    return "HOME" if (mode or "lab") == "home" else "VISIT"


def format_address_snapshot(snapshot: dict[str, Any] | None) -> str:
    if not snapshot:
        return ""
    parts = [
        snapshot.get("address_line_1") or snapshot.get("line1") or "",
        snapshot.get("address_line_2") or snapshot.get("line2") or "",
        snapshot.get("landmark") or "",
        snapshot.get("city") or "",
        snapshot.get("state") or "",
        snapshot.get("pincode") or "",
    ]
    return ", ".join(p for p in parts if p).strip()


def slot_label_for_order(order) -> str:
    mode = order.sample_collection_mode or "lab"
    if mode == "home":
        collection = getattr(order, "collection_request", None)
        if collection is not None:
            slot_date = collection.confirmed_date or collection.preferred_date
            slot_text = collection.confirmed_slot or collection.preferred_slot
            if slot_date and slot_text:
                return f"{slot_date.strftime('%d %b %Y')} {slot_text}"
            if slot_text:
                return slot_text
    else:
        visit = getattr(order, "visit_appointment", None)
        if visit is not None:
            return f"{visit.appointment_date.strftime('%d %b %Y')} {visit.appointment_slot}"

    if order.scheduled_at:
        local = timezone.localtime(order.scheduled_at)
        return local.strftime("%d %b %Y %I:%M %p")
    return "—"


def compute_order_urgency(
    order,
    investigations_by_item_id: dict[str, InvestigationItem],
) -> str:
    best_rank = -1
    best_api = API_URGENCY_ROUTINE
    items = order.items.all() if hasattr(order, "_prefetched_objects_cache") else order.items.filter(
        deleted_at__isnull=True
    )
    for oi in items:
        inv_id = (oi.metadata_snapshot or {}).get("investigation_item_id")
        if not inv_id:
            continue
        inv = investigations_by_item_id.get(str(inv_id))
        if inv is None:
            continue
        rank = _URGENCY_RANK.get(inv.urgency, 0)
        if rank > best_rank:
            best_rank = rank
            best_api = api_urgency_from_investigation(inv.urgency)
    return best_api


def aggregate_sample_status(order) -> str | None:
    statuses: list[str] = []
    for line in order.test_lines.all():
        tracking = getattr(line, "sample_tracking", None)
        if tracking is not None:
            statuses.append(tracking.sample_status)
    if not statuses:
        return None
    return max(statuses, key=lambda s: _SAMPLE_RANK.get(s, 0))


def aggregate_report_status(order) -> str | None:
    statuses: list[str] = []
    for line in order.test_lines.all():
        report = get_active_report_for_line(line)
        if report and report.status:
            statuses.append(report.status)
    if not statuses:
        return None
    return max(statuses, key=lambda s: _REPORT_RANK.get(s, 0))


def doctor_display_name(doctor) -> str:
    if doctor is None:
        return ""
    user = getattr(doctor, "user", None)
    if user is None:
        return ""
    full = user.get_full_name()
    return full.strip() or user.username


def patient_gender_display(profile) -> str:
    if profile is None or not profile.gender:
        return ""
    return profile.gender.title()


@dataclass(frozen=True)
class LabOrderListRowDTO:
    id: str
    order_number: str
    assignment_id: str
    patient_name: str
    patient_phone: str
    patient_age: int | None
    patient_gender: str
    patient_address: str
    doctor_name: str
    clinic_name: str
    test_names: list[str]
    collection_type: str
    preferred_slot_label: str
    urgency: str
    status: str
    created_at: datetime
    assigned_at: datetime
    accepted_at: datetime | None
    rejected_at: datetime | None
    rejection_reason: str | None
    sample_status: str | None
    report_status: str | None
    home_collection: bool


def build_list_row_dto(assignment, investigations_by_item_id: dict[str, InvestigationItem]) -> LabOrderListRowDTO:
    order = assignment.diagnostic_order
    profile = order.patient_profile
    user = profile.account.user if profile and profile.account_id else None
    clinic_name = ""
    if order.consultation_id and order.consultation:
        encounter = order.consultation.encounter
        if encounter and encounter.clinic_id:
            clinic_name = encounter.clinic.name

    test_names = [tl.service.name for tl in order.test_lines.all() if tl.service_id]
    collection_type = collection_type_from_mode(order.sample_collection_mode)
    address = ""
    if collection_type == "HOME":
        collection = getattr(order, "collection_request", None)
        if collection is not None:
            address = format_address_snapshot(collection.address_snapshot)

    return LabOrderListRowDTO(
        id=str(order.id),
        order_number=order.order_number,
        assignment_id=str(assignment.id),
        patient_name=profile.get_full_name() if profile else "",
        patient_phone=getattr(user, "username", "") or "",
        patient_age=profile.age if profile else None,
        patient_gender=patient_gender_display(profile),
        patient_address=address,
        doctor_name=doctor_display_name(order.doctor),
        clinic_name=clinic_name,
        test_names=test_names,
        collection_type=collection_type,
        preferred_slot_label=slot_label_for_order(order),
        urgency=compute_order_urgency(order, investigations_by_item_id),
        status=assignment.status,
        created_at=assignment.assigned_at,
        assigned_at=assignment.assigned_at,
        accepted_at=assignment.accepted_at,
        rejected_at=assignment.rejected_at,
        rejection_reason=assignment.rejection_reason,
        sample_status=aggregate_sample_status(order),
        report_status=aggregate_report_status(order),
        home_collection=collection_type == "HOME",
    )

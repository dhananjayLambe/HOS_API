"""
Branch visit logistics workflow for LabVisitAppointment.

Operational scope: confirm, reschedule, check-in, complete, no-show.
Test execution provisioning runs at check-in via test_execution_provisioning only.

Enforces a strict transition graph via ALLOWED_TRANSITIONS. Views must never mutate
status directly — call service methods only.
"""

from __future__ import annotations

from datetime import date
from typing import Callable
from uuid import UUID

from django.db import transaction
from django.utils import timezone

from labs.choices.workflow import AppointmentStatus
from labs.models import LabUser, LabVisitAppointment

TERMINAL_STATUSES = frozenset(
    {
        AppointmentStatus.COMPLETED,
        AppointmentStatus.NO_SHOW,
        AppointmentStatus.CANCELLED,
    },
)

ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    AppointmentStatus.PENDING: {
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.NO_SHOW,
        AppointmentStatus.RESCHEDULED,
    },
    AppointmentStatus.CONFIRMED: {
        AppointmentStatus.CHECKED_IN,
        AppointmentStatus.NO_SHOW,
        AppointmentStatus.RESCHEDULED,
    },
    AppointmentStatus.CHECKED_IN: {
        AppointmentStatus.COMPLETED,
        AppointmentStatus.NO_SHOW,
    },
    AppointmentStatus.RESCHEDULED: {
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.NO_SHOW,
    },
    AppointmentStatus.COMPLETED: set(),
    AppointmentStatus.NO_SHOW: set(),
    AppointmentStatus.CANCELLED: set(),
}

EVENT_NAME_BY_STATUS = {
    AppointmentStatus.CONFIRMED: "confirmed",
    AppointmentStatus.CHECKED_IN: "checked_in",
    AppointmentStatus.COMPLETED: "completed",
    AppointmentStatus.NO_SHOW: "no_show",
    AppointmentStatus.RESCHEDULED: "rescheduled",
}

ACTION_TARGET_STATUS = {
    "confirm": AppointmentStatus.CONFIRMED,
    "check_in": AppointmentStatus.CHECKED_IN,
    "complete": AppointmentStatus.COMPLETED,
    "mark_no_show": AppointmentStatus.NO_SHOW,
    "reschedule": AppointmentStatus.RESCHEDULED,
}


class VisitWorkflowError(Exception):
    def __init__(
        self,
        message: str = "Invalid workflow transition for current appointment status.",
    ):
        super().__init__(message)
        self.message = message


class VisitNotFoundError(Exception):
    pass


def ensure_not_terminal(status: str) -> None:
    if status in TERMINAL_STATUSES:
        raise VisitWorkflowError(
            f"Cannot mutate visit appointment in terminal status {status}.",
        )


def validate_transition(*, current_status: str, target_status: str) -> None:
    allowed = ALLOWED_TRANSITIONS.get(current_status, set())
    if target_status not in allowed:
        raise VisitWorkflowError(
            f"Cannot transition from {current_status} to {target_status}.",
        )


def is_terminal_status(status: str) -> bool:
    return status in TERMINAL_STATUSES


def allowed_actions_for_status(status: str) -> list[str]:
    mapping = {
        AppointmentStatus.PENDING: ["confirm", "mark_no_show", "reschedule"],
        AppointmentStatus.CONFIRMED: ["check_in", "mark_no_show", "reschedule"],
        AppointmentStatus.CHECKED_IN: ["complete", "mark_no_show"],
        AppointmentStatus.RESCHEDULED: ["confirm", "mark_no_show"],
        AppointmentStatus.COMPLETED: [],
        AppointmentStatus.NO_SHOW: [],
        AppointmentStatus.CANCELLED: [],
    }
    return list(mapping.get(status, []))


def workflow_hint_for_status(status: str) -> str:
    return {
        AppointmentStatus.PENDING: "Awaiting appointment confirmation",
        AppointmentStatus.CONFIRMED: "Patient appointment confirmed",
        AppointmentStatus.CHECKED_IN: "Patient checked in",
        AppointmentStatus.COMPLETED: "Appointment completed",
        AppointmentStatus.NO_SHOW: "Patient did not arrive",
        AppointmentStatus.CANCELLED: "Appointment cancelled",
        AppointmentStatus.RESCHEDULED: "Confirm rescheduled slot",
    }.get(status, "Review appointment")


def target_status_for_action(*, action: str, current_status: str) -> str | None:
    target = ACTION_TARGET_STATUS.get(action)
    if target is None:
        return None
    allowed = ALLOWED_TRANSITIONS.get(current_status, set())
    if target not in allowed:
        return None
    return target


def workflow_response_fields(
    visit: LabVisitAppointment,
    *,
    message: str = "",
    success: bool = True,
) -> dict:
    status = visit.status
    return {
        "success": success,
        "appointment_status": status,
        "allowed_actions": allowed_actions_for_status(status),
        "workflow_hint": workflow_hint_for_status(status),
        "message": message,
        "appointment_id": str(visit.id),
        "confirmed_at": visit.confirmed_at,
        "checked_in_at": visit.checked_in_at,
        "completed_at": visit.completed_at,
        "no_show_at": visit.no_show_at,
        "cancelled_at": visit.cancelled_at,
        "status_changed_at": visit.status_changed_at,
    }


def get_visit_for_lab_user(
    *,
    visit_id: UUID | str,
    lab_user: LabUser,
    select_for_update: bool = False,
) -> LabVisitAppointment:
    if select_for_update:
        qs = LabVisitAppointment.objects.select_related(
            "diagnostic_order",
            "lab_branch",
        ).select_for_update()
    else:
        qs = LabVisitAppointment.objects.select_related(
            "diagnostic_order",
            "lab_branch",
        )
    try:
        return qs.get(
            pk=visit_id,
            lab_branch_id=lab_user.branch_id,
            is_deleted=False,
        )
    except LabVisitAppointment.DoesNotExist as exc:
        raise VisitNotFoundError from exc


def _ensure_not_terminal_visit(visit: LabVisitAppointment) -> None:
    ensure_not_terminal(visit.status)


def _append_workflow_event(
    visit: LabVisitAppointment,
    *,
    from_status: str,
    to_status: str,
    lab_user: LabUser,
    extra: dict | None = None,
) -> None:
    event_name = EVENT_NAME_BY_STATUS.get(to_status)
    if not event_name:
        raise VisitWorkflowError(f"No event name mapped for target status {to_status}.")

    metadata = dict(visit.metadata or {})
    events = list(metadata.get("workflow_events") or [])
    entry = {
        "event": event_name,
        "timestamp": timezone.now().isoformat(),
        "performed_by_user_id": str(lab_user.user_id),
        "previous_status": from_status,
        "to_status": to_status,
    }
    if extra:
        entry.update(extra)
    events.append(entry)
    metadata["workflow_events"] = events
    visit.metadata = metadata


def _touch_status_changed(visit: LabVisitAppointment, now) -> None:
    visit.status_changed_at = now


def _transition(
    *,
    visit: LabVisitAppointment,
    target_status: str,
    lab_user: LabUser,
    update_fields: list[str],
    event_extra: dict | None = None,
) -> None:
    _ensure_not_terminal_visit(visit)
    validate_transition(current_status=visit.status, target_status=target_status)
    from_status = visit.status
    visit.status = target_status
    _append_workflow_event(
        visit,
        from_status=from_status,
        to_status=target_status,
        lab_user=lab_user,
        extra=event_extra,
    )
    fields = list(
        dict.fromkeys(
            [*update_fields, "status", "metadata", "status_changed_at", "updated_at"],
        ),
    )
    visit.save(update_fields=fields)


def _run_transition(
    *,
    visit_id: UUID | str,
    lab_user: LabUser,
    target_status: str,
    apply: Callable[[LabVisitAppointment], tuple[list[str], dict | None]],
) -> LabVisitAppointment:
    with transaction.atomic():
        visit = get_visit_for_lab_user(
            visit_id=visit_id,
            lab_user=lab_user,
            select_for_update=True,
        )
        update_fields, event_extra = apply(visit)
        _transition(
            visit=visit,
            target_status=target_status,
            lab_user=lab_user,
            update_fields=update_fields,
            event_extra=event_extra,
        )
    visit.refresh_from_db()
    return visit


def confirm_visit(
    *,
    visit_id: UUID | str,
    lab_user: LabUser,
) -> LabVisitAppointment:
    now = timezone.now()

    def apply(visit: LabVisitAppointment) -> tuple[list[str], dict | None]:
        _touch_status_changed(visit, now)
        fields = ["status_changed_at"]
        if visit.confirmed_at is None:
            visit.confirmed_at = now
            fields.append("confirmed_at")
        return fields, None

    visit = _run_transition(
        visit_id=visit_id,
        lab_user=lab_user,
        target_status=AppointmentStatus.CONFIRMED,
        apply=apply,
    )
    from business_audit.booking.constants import CONFIRMATION_SOURCE_VISIT
    from business_audit.booking.hooks import schedule_booking_business_confirmed

    schedule_booking_business_confirmed(
        order=visit.diagnostic_order,
        user=lab_user.user,
        confirmation_source=CONFIRMATION_SOURCE_VISIT,
    )
    return visit


def check_in_visit(
    *,
    visit_id: UUID | str,
    lab_user: LabUser,
) -> LabVisitAppointment:
    now = timezone.now()

    def apply(visit: LabVisitAppointment) -> tuple[list[str], dict | None]:
        visit.checked_in_at = now
        _touch_status_changed(visit, now)
        return ["checked_in_at", "status_changed_at"], None

    visit = _run_transition(
        visit_id=visit_id,
        lab_user=lab_user,
        target_status=AppointmentStatus.CHECKED_IN,
        apply=apply,
    )

    assignment = getattr(visit.diagnostic_order, "lab_assignment", None)
    if assignment is not None:
        from labs.services.test_execution_provisioning import ensure_test_executions

        ensure_test_executions(
            assignment=assignment,
            visit_appointment=visit,
        )

    return visit


def complete_visit(
    *,
    visit_id: UUID | str,
    lab_user: LabUser,
) -> LabVisitAppointment:
    now = timezone.now()

    def apply(visit: LabVisitAppointment) -> tuple[list[str], dict | None]:
        visit.completed_at = now
        _touch_status_changed(visit, now)
        return ["completed_at", "status_changed_at"], None

    return _run_transition(
        visit_id=visit_id,
        lab_user=lab_user,
        target_status=AppointmentStatus.COMPLETED,
        apply=apply,
    )


def mark_no_show(
    *,
    visit_id: UUID | str,
    lab_user: LabUser,
    reason: str = "",
) -> LabVisitAppointment:
    now = timezone.now()
    note = (reason or "").strip()
    event_extra = {"reason": note} if note else None

    def apply(visit: LabVisitAppointment) -> tuple[list[str], dict | None]:
        visit.no_show_at = now
        # Legacy/timeline field: frontend maps cancelledAt for NO_SHOW display.
        visit.cancelled_at = now
        _touch_status_changed(visit, now)
        fields = ["no_show_at", "cancelled_at", "status_changed_at"]
        if note:
            metadata = dict(visit.metadata or {})
            metadata["no_show_reason"] = note
            visit.metadata = metadata
            fields.append("metadata")
        return fields, event_extra

    return _run_transition(
        visit_id=visit_id,
        lab_user=lab_user,
        target_status=AppointmentStatus.NO_SHOW,
        apply=apply,
    )


def reschedule_visit(
    *,
    visit_id: UUID | str,
    lab_user: LabUser,
    appointment_date: date | None = None,
    appointment_slot: str | None = None,
) -> LabVisitAppointment:
    visit_before = get_visit_for_lab_user(visit_id=visit_id, lab_user=lab_user)
    old_date = visit_before.appointment_date
    old_slot = visit_before.appointment_slot
    order = visit_before.diagnostic_order

    now = timezone.now()
    slot = (appointment_slot or "").strip()
    event_extra: dict = {}
    if appointment_date is not None:
        event_extra["appointment_date"] = appointment_date.isoformat()
    if slot:
        event_extra["appointment_slot"] = slot

    def apply(visit: LabVisitAppointment) -> tuple[list[str], dict | None]:
        _touch_status_changed(visit, now)
        fields = ["status_changed_at"]
        if appointment_date is not None:
            visit.appointment_date = appointment_date
            fields.append("appointment_date")
        if slot:
            visit.appointment_slot = slot
            fields.append("appointment_slot")
        extra = event_extra or None
        return fields, extra

    visit = _run_transition(
        visit_id=visit_id,
        lab_user=lab_user,
        target_status=AppointmentStatus.RESCHEDULED,
        apply=apply,
    )

    from business_audit.booking.hooks import schedule_booking_business_modified
    from business_audit.booking.snapshot_builder import BookingSnapshotBuilder

    schedule_booking_business_modified(
        order=order,
        user=lab_user.user,
        modification_reason="slot_reschedule",
        before_snapshot=BookingSnapshotBuilder.slot_snapshot(date=old_date, slot=old_slot),
        after_snapshot=BookingSnapshotBuilder.slot_snapshot(
            date=visit.appointment_date,
            slot=visit.appointment_slot,
        ),
    )
    return visit

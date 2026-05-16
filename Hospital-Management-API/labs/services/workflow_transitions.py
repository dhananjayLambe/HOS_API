"""Lab order assignment workflow transitions (accept / reject / auto-reject)."""

from __future__ import annotations

from datetime import timedelta
from typing import TYPE_CHECKING
from uuid import UUID

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from labs.choices.workflow import LabAssignmentStatus
from labs.models import LabOrderAssignment, LabUser

if TYPE_CHECKING:
    pass

AUTO_REJECT_REASON = "Auto-rejected: no lab acceptance within SLA window."


class WorkflowTransitionError(Exception):
    """Raised when a workflow transition is not allowed (maps to HTTP 409)."""

    def __init__(self, message: str = "Invalid workflow transition for current assignment status."):
        super().__init__(message)
        self.message = message


class AssignmentNotFoundError(Exception):
    """Assignment missing or not visible to lab user (maps to HTTP 404)."""


class RejectReasonRequiredError(Exception):
    """Empty rejection reason (maps to HTTP 400)."""


def can_accept(assignment: LabOrderAssignment) -> bool:
    return assignment.status == LabAssignmentStatus.PENDING


def can_reject(assignment: LabOrderAssignment) -> bool:
    return assignment.status == LabAssignmentStatus.PENDING


def get_assignment_for_lab_user(
    assignment_id: UUID | str,
    lab_user: LabUser,
) -> LabOrderAssignment:
    try:
        return (
            LabOrderAssignment.objects.select_related("lab_branch", "diagnostic_order")
            .get(pk=assignment_id, lab_branch_id=lab_user.branch_id)
        )
    except LabOrderAssignment.DoesNotExist as exc:
        raise AssignmentNotFoundError from exc


def _lock_assignment(assignment_id: UUID | str) -> LabOrderAssignment:
    return LabOrderAssignment.objects.select_for_update().get(pk=assignment_id)


def accept_assignment(assignment_id: UUID | str, lab_user: LabUser) -> LabOrderAssignment:
    get_assignment_for_lab_user(assignment_id, lab_user)

    with transaction.atomic():
        assignment = _lock_assignment(assignment_id)
        if assignment.lab_branch_id != lab_user.branch_id:
            raise AssignmentNotFoundError
        if not can_accept(assignment):
            raise WorkflowTransitionError(
                f"Cannot accept assignment in status {assignment.status}.",
            )
        now = timezone.now()
        assignment.status = LabAssignmentStatus.ACCEPTED
        assignment.accepted_at = now
        assignment.save(update_fields=["status", "accepted_at", "updated_at"])
    assignment.refresh_from_db()
    return assignment


def reject_assignment(
    assignment_id: UUID | str,
    lab_user: LabUser,
    reason: str,
    *,
    auto_rejected: bool = False,
) -> LabOrderAssignment:
    reason = (reason or "").strip()
    if not reason:
        raise RejectReasonRequiredError

    get_assignment_for_lab_user(assignment_id, lab_user)

    with transaction.atomic():
        assignment = _lock_assignment(assignment_id)
        if assignment.lab_branch_id != lab_user.branch_id:
            raise AssignmentNotFoundError
        if not can_reject(assignment):
            raise WorkflowTransitionError(
                f"Cannot reject assignment in status {assignment.status}.",
            )
        now = timezone.now()
        assignment.status = LabAssignmentStatus.REJECTED
        assignment.rejected_at = now
        assignment.rejection_reason = reason
        if auto_rejected:
            metadata = dict(assignment.metadata or {})
            metadata["auto_rejected"] = True
            metadata["auto_rejected_at"] = now.isoformat()
            assignment.metadata = metadata
            assignment.save(
                update_fields=[
                    "status",
                    "rejected_at",
                    "rejection_reason",
                    "metadata",
                    "updated_at",
                ],
            )
        else:
            assignment.save(
                update_fields=[
                    "status",
                    "rejected_at",
                    "rejection_reason",
                    "updated_at",
                ],
            )
    assignment.refresh_from_db()
    return assignment


def reject_stale_pending_assignments() -> int:
    """
    Auto-reject PENDING assignments older than LAB_ASSIGNMENT_AUTO_REJECT_MINUTES.
    Returns count of assignments rejected.
    """
    minutes = getattr(settings, "LAB_ASSIGNMENT_AUTO_REJECT_MINUTES", 60)
    cutoff = timezone.now() - timedelta(minutes=minutes)
    rejected_count = 0

    stale_ids = list(
        LabOrderAssignment.objects.filter(
            status=LabAssignmentStatus.PENDING,
            assigned_at__lt=cutoff,
        ).values_list("pk", flat=True)[:500],
    )

    for pk in stale_ids:
        with transaction.atomic():
            try:
                assignment = (
                    LabOrderAssignment.objects.select_for_update(skip_locked=True)
                    .get(pk=pk)
                )
            except LabOrderAssignment.DoesNotExist:
                continue

            if assignment.status != LabAssignmentStatus.PENDING:
                continue
            if assignment.assigned_at >= cutoff:
                continue

            now = timezone.now()
            assignment.status = LabAssignmentStatus.REJECTED
            assignment.rejected_at = now
            assignment.rejection_reason = AUTO_REJECT_REASON
            metadata = dict(assignment.metadata or {})
            metadata["auto_rejected"] = True
            metadata["auto_rejected_at"] = now.isoformat()
            assignment.metadata = metadata
            assignment.save(
                update_fields=[
                    "status",
                    "rejected_at",
                    "rejection_reason",
                    "metadata",
                    "updated_at",
                ],
            )
            rejected_count += 1

    return rejected_count

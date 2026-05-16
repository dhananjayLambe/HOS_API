"""Provision lab operational queue rows when orders are routed to a branch."""

from __future__ import annotations

from typing import TYPE_CHECKING

from labs.choices.workflow import LabAssignmentStatus
from labs.models import LabOrderAssignment

if TYPE_CHECKING:
    from account.models import User
    from diagnostics_engine.models.orders import DiagnosticOrder
    from labs.models import LabBranch


def ensure_lab_order_assignment(
    *,
    diagnostic_order: DiagnosticOrder,
    lab_branch: LabBranch,
    assigned_by: User | None = None,
) -> tuple[LabOrderAssignment, bool]:
    """
    Idempotent: one LabOrderAssignment per diagnostic order.
    Does not change branch/status if the row already exists.
    """
    assignment, created = LabOrderAssignment.objects.get_or_create(
        diagnostic_order=diagnostic_order,
        defaults={
            "lab_branch": lab_branch,
            "assigned_by": assigned_by,
            "status": LabAssignmentStatus.PENDING,
        },
    )
    return assignment, created

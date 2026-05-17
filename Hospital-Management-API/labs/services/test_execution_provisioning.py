"""Provision LabOrderTestExecution rows (one per DiagnosticOrderTestLine)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from django.db import transaction
from django.utils import timezone

from labs.choices.workflow import LabAssignmentStatus, TestExecutionStatus, TestExecutionType
from labs.models import ACTIVE_TEST_EXECUTION_STATUSES, LabOrderTestExecution
from labs.services.collection_request_provisioning import ProvisioningError

if TYPE_CHECKING:
    from labs.models import LabCollectionRequest, LabOrderAssignment, LabVisitAppointment


def ensure_test_executions(
    *,
    assignment: LabOrderAssignment,
    collection_request: LabCollectionRequest | None = None,
    visit_appointment: LabVisitAppointment | None = None,
) -> list[LabOrderTestExecution]:
    """
    Idempotent per (assignment, test_line) for active execution statuses.

    Requires exactly one workflow link: collection_request XOR visit_appointment.
    """
    if assignment.status != LabAssignmentStatus.ACCEPTED:
        raise ProvisioningError(
            f"Cannot provision test executions for assignment in status {assignment.status}.",
        )

    has_collection = collection_request is not None
    has_visit = visit_appointment is not None
    if has_collection == has_visit:
        raise ProvisioningError(
            "Exactly one of collection_request or visit_appointment must be provided.",
        )

    if has_collection:
        execution_type = TestExecutionType.HOME_COLLECTION
        execution_source = "home_collection"
    else:
        execution_type = TestExecutionType.BRANCH_VISIT
        execution_source = "branch_visit"

    provisioned_at = timezone.now().isoformat()
    created_rows: list[LabOrderTestExecution] = []

    with transaction.atomic():
        for test_line in assignment.diagnostic_order.test_lines.all():
            existing = LabOrderTestExecution.objects.filter(
                assignment=assignment,
                test_line=test_line,
                execution_status__in=ACTIVE_TEST_EXECUTION_STATUSES,
            ).first()
            if existing:
                continue

            row = LabOrderTestExecution.objects.create(
                assignment=assignment,
                test_line=test_line,
                lab_branch=assignment.lab_branch,
                execution_status=TestExecutionStatus.PENDING,
                execution_type=execution_type,
                collection_request=collection_request,
                visit_appointment=visit_appointment,
                metadata={
                    "execution_source": execution_source,
                    "provisioned_at": provisioned_at,
                },
            )
            created_rows.append(row)

    return created_rows

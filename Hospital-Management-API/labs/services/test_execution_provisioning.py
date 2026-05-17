"""Provision LabOrderTestExecution rows when a lab accepts an order."""

from __future__ import annotations

from typing import TYPE_CHECKING

from labs.choices.workflow import TestExecutionStatus, TestExecutionType
from labs.models import LabOrderTestExecution

if TYPE_CHECKING:
    from labs.models import LabOrderAssignment


def ensure_test_executions_for_assignment(assignment: LabOrderAssignment) -> list[LabOrderTestExecution]:
    """
    Idempotent per (assignment, test_line).
    Links collection_request for home orders when it already exists.
    """
    order = assignment.diagnostic_order
    mode = order.sample_collection_mode or "lab"
    execution_type = (
        TestExecutionType.HOME_COLLECTION
        if mode == "home"
        else TestExecutionType.BRANCH_VISIT
    )
    collection_request = getattr(order, "collection_request", None)
    visit_appointment = getattr(order, "visit_appointment", None)

    created_rows: list[LabOrderTestExecution] = []
    test_lines = order.test_lines.all()
    for test_line in test_lines:
        defaults = {
            "lab_branch_id": assignment.lab_branch_id,
            "execution_type": execution_type,
            "execution_status": TestExecutionStatus.PENDING,
        }
        if execution_type == TestExecutionType.HOME_COLLECTION and collection_request:
            defaults["collection_request"] = collection_request
        if execution_type == TestExecutionType.BRANCH_VISIT and visit_appointment:
            defaults["visit_appointment"] = visit_appointment

        row, created = LabOrderTestExecution.objects.get_or_create(
            assignment=assignment,
            test_line=test_line,
            defaults=defaults,
        )
        if created:
            created_rows.append(row)
    return created_rows

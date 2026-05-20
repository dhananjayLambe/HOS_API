"""Branch-scoped access control for diagnostic report operational APIs."""

from __future__ import annotations

from django.core.exceptions import PermissionDenied
from django.db.models import QuerySet

from diagnostics_engine.models.reports import DiagnosticTestReport
from labs.models.lab_tracking import LabReportDeliveryLog

_BRANCH_FILTER = "order_test_line__order__branch_id"


def get_report_branch_id(report: DiagnosticTestReport):
    """Source of truth: report.order_test_line.order.branch_id."""
    order = report.order_test_line.order
    return getattr(order, "branch_id", None)


def report_belongs_to_branch(*, report: DiagnosticTestReport, branch_id) -> bool:
    report_branch = get_report_branch_id(report)
    if report_branch is None or branch_id is None:
        return False
    return str(report_branch) == str(branch_id)


def validate_report_branch_access(
    *,
    report: DiagnosticTestReport,
    branch_id,
    message: str = "Report not accessible for this branch.",
) -> None:
    if not report_belongs_to_branch(report=report, branch_id=branch_id):
        raise PermissionDenied(message)


def validate_delivery_log_branch_access(
    *,
    delivery_log: LabReportDeliveryLog,
    branch_id,
    message: str = "Delivery log not accessible for this branch.",
) -> None:
    report = delivery_log.diagnostic_test_report
    validate_report_branch_access(report=report, branch_id=branch_id, message=message)


def filter_reports_queryset_for_branch(
    qs: QuerySet[DiagnosticTestReport],
    branch_id,
) -> QuerySet[DiagnosticTestReport]:
    """List APIs — filter at queryset level only."""
    return qs.filter(**{_BRANCH_FILTER: branch_id})

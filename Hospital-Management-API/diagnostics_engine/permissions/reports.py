"""Permissions for diagnostic report operational APIs."""

from __future__ import annotations

from rest_framework.permissions import BasePermission

from diagnostics_engine.domain.reports.report_actions import ReportAction
from diagnostics_engine.monitoring.request_context import resolve_request_id
from diagnostics_engine.permissions.report_context import ReportRequestContext
from diagnostics_engine.services.reports.access_control import report_belongs_to_branch
from labs.api.permissions import IsLabAdminUser
from labs.api.services.lab_session_resolver import LabSessionDenied, resolve_lab_user


class BranchScopedPermissionMixin:
    """Resolve lab session and attach request._report_context."""

    def resolve_report_context(self, request) -> ReportRequestContext | LabSessionDenied:
        if hasattr(request, "_report_context") and request._report_context is not None:
            return request._report_context

        resolved = resolve_lab_user(request)
        if isinstance(resolved, LabSessionDenied):
            return resolved

        header_rid = (request.META.get("HTTP_X_REQUEST_ID") or "").strip()
        request_id = resolve_request_id(header_rid or None)
        ctx = ReportRequestContext(
            lab_user=resolved.lab_user,
            branch_id=resolved.lab_user.branch_id,
            request_id=request_id,
        )
        request._report_context = ctx
        return ctx

    @staticmethod
    def get_branch_id(request) -> object | None:
        ctx = getattr(request, "_report_context", None)
        if ctx is not None:
            return ctx.branch_id
        return None


class _LabReportAccessMixin(BranchScopedPermissionMixin):
    def _resolved_lab_user(self, request):
        ctx = self.resolve_report_context(request)
        if isinstance(ctx, LabSessionDenied):
            return ctx
        return ctx


class CanUploadReports(_LabReportAccessMixin, BasePermission):
    message = "You do not have permission to upload reports."

    def has_permission(self, request, view):
        if not IsLabAdminUser().has_permission(request, view):
            return False
        resolved = self._resolved_lab_user(request)
        return not isinstance(resolved, LabSessionDenied)


class CanViewReportDetail(_LabReportAccessMixin, BasePermission):
    message = "You do not have permission to view this report."

    def has_permission(self, request, view):
        if not IsLabAdminUser().has_permission(request, view):
            return False
        resolved = self._resolved_lab_user(request)
        return not isinstance(resolved, LabSessionDenied)

    def has_object_permission(self, request, view, obj):
        resolved = self._resolved_lab_user(request)
        if isinstance(resolved, LabSessionDenied):
            return False
        return report_belongs_to_branch(
            report=obj,
            branch_id=resolved.lab_user.branch_id,
        )


class CanDeliverReports(CanUploadReports):
    message = "You do not have permission to deliver reports."


class CanCorrectReports(CanUploadReports):
    message = "You do not have permission to correct reports."


class CanDownloadReports(CanViewReportDetail):
    message = "You do not have permission to download reports."


REPORT_ACTION_PERMISSION_MAP = {
    ReportAction.UPLOAD_REPORT: CanUploadReports,
    ReportAction.MARK_READY: CanUploadReports,
    ReportAction.SEND_WHATSAPP: CanDeliverReports,
    ReportAction.RETRY_DELIVERY: CanDeliverReports,
    ReportAction.VIEW_REPORT: CanViewReportDetail,
    ReportAction.DOWNLOAD_REPORT: CanDownloadReports,
    ReportAction.CORRECT_REPORT: CanCorrectReports,
}


def permission_class_for_action(action: ReportAction | str) -> type[BasePermission]:
    key = ReportAction(action) if isinstance(action, str) else action
    return REPORT_ACTION_PERMISSION_MAP[key]

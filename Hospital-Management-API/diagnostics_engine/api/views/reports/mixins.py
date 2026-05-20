"""Shared mixins for diagnostic report operational API views."""

from __future__ import annotations

from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from diagnostics_engine.api import error_codes
from diagnostics_engine.api.responses import error_response
from diagnostics_engine.models.reports import DiagnosticTestReport
from diagnostics_engine.permissions.report_context import ReportRequestContext
from diagnostics_engine.permissions.reports import BranchScopedPermissionMixin
from diagnostics_engine.services.reports.access_control import report_belongs_to_branch
from labs.api.services.lab_session_resolver import LabSessionDenied


class LabReportOperationalMixin(BranchScopedPermissionMixin, APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def resolve_lab(self, request):
        """Return (lab_user, error_response) for backward-compatible view code."""
        ctx = self.resolve_report_context(request)
        if isinstance(ctx, LabSessionDenied):
            return None, error_response(
                ctx.response.data.get("detail", "Lab access denied."),
                code=error_codes.PERMISSION_DENIED,
                status=ctx.response.status_code,
                request=request,
            )
        return ctx.lab_user, None

    def get_report_context(self, request) -> ReportRequestContext | None:
        ctx = self.resolve_report_context(request)
        if isinstance(ctx, LabSessionDenied):
            return None
        return ctx

    def get_report_for_branch(self, request, report_id, *, lab_user=None):
        report = get_object_or_404(DiagnosticTestReport, pk=report_id)
        ctx = self.get_report_context(request)
        branch_id = lab_user.branch_id if lab_user is not None else (ctx.branch_id if ctx else None)
        if branch_id is None:
            return None, error_response(
                "Lab session required.",
                code=error_codes.PERMISSION_DENIED,
                status=403,
                request=request,
            )
        if not report_belongs_to_branch(report=report, branch_id=branch_id):
            return None, error_response(
                "Report not accessible for this branch.",
                code=error_codes.BRANCH_ACCESS_DENIED,
                status=403,
                request=request,
            )
        return report, None

    def branch_access_error_from_validation(self, request, exc):
        """Map PermissionDenied from access_control to API envelope."""
        message = str(exc)
        return error_response(
            message,
            code=error_codes.BRANCH_ACCESS_DENIED,
            status=403,
            request=request,
        )

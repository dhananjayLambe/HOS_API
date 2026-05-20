"""POST retry delivery — append-only new log row."""

from __future__ import annotations

from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from diagnostics_engine.api import error_codes
from diagnostics_engine.api.responses import error_response, success_response, validation_error_response
from diagnostics_engine.api.serializers.reports.delivery_actions import RetryDeliveryResponseSerializer
from diagnostics_engine.api.views.reports.mixins import LabReportOperationalMixin
from diagnostics_engine.permissions.reports import CanDeliverReports
from diagnostics_engine.services.reports.access_control import validate_delivery_log_branch_access
from diagnostics_engine.services.reports.report_delivery_service import ReportDeliveryService
from labs.models.lab_tracking import LabReportDeliveryLog


class RetryDeliveryView(LabReportOperationalMixin):
    permission_classes = [IsAuthenticated, CanDeliverReports]

    def post(self, request, log_id):
        lab_user, err = self.resolve_lab(request)
        if err:
            return err

        delivery_log = get_object_or_404(
            LabReportDeliveryLog.objects.select_related(
                "diagnostic_test_report",
                "diagnostic_test_report__order_test_line__order",
            ),
            pk=log_id,
            is_deleted=False,
        )
        from django.core.exceptions import PermissionDenied

        try:
            validate_delivery_log_branch_access(
                delivery_log=delivery_log,
                branch_id=lab_user.branch_id,
            )
        except PermissionDenied as exc:
            return error_response(
                str(exc),
                code=error_codes.BRANCH_ACCESS_DENIED,
                status=status.HTTP_403_FORBIDDEN,
                request=request,
            )

        parent_id = delivery_log.id
        try:
            new_log = ReportDeliveryService.retry_delivery(
                delivery_log=delivery_log,
                initiated_by=request.user,
            )
        except DjangoValidationError as exc:
            return validation_error_response(exc, request=request)

        payload = RetryDeliveryResponseSerializer(
            {
                "new_delivery_log_id": new_log.id,
                "parent_delivery_log_id": parent_id,
                "status": new_log.delivery_status,
            }
        ).data
        return success_response(payload, request=request)

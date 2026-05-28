"""Operational report views (v1 contract) — thin views, service-driven."""

from __future__ import annotations

from datetime import date, datetime, timedelta

from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from django.utils import timezone
from labs.models.lab_workflow import LabOrderAssignment
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated

from diagnostics_engine.api import error_codes
from diagnostics_engine.api.pagination import ReportTaskCursorPagination
from diagnostics_engine.api.responses import (
    error_response,
    success_response,
    validation_error_response,
)
from diagnostics_engine.api.views.reports.mixins import LabReportOperationalMixin
from diagnostics_engine.api.serializers.reports.report_artifact import ReportArtifactSerializer
from diagnostics_engine.api.serializers.reports.report_detail import ReportDetailSerializer
from diagnostics_engine.api.serializers.reports.report_task import (
    ReportTaskContextSerializer,
    ReportTaskSerializer,
)
from diagnostics_engine.api.serializers.reports.upload_request import UploadArtifactRequestSerializer
from diagnostics_engine.models.choices import ReportLifecycleStatus
from diagnostics_engine.models.reports import DiagnosticTestReport
from diagnostics_engine.permissions.reports import CanDownloadReports, CanUploadReports, CanViewReportDetail
from diagnostics_engine.services.reports import (
    ArtifactUploadService,
    ReportQueryService,
    ReportWorkflowService,
)
from diagnostics_engine.monitoring.report_events import safe_emit
from diagnostics_engine.services.reports.report_audit import emit_report_audit_event
from diagnostics_engine.services.reports.report_download_service import ReportDownloadService
from diagnostics_engine.services.reports.report_detail_presenter import build_report_detail_dto
from diagnostics_engine.services.reports.report_task_presenter import (
    build_report_task_context,
    build_report_task_dtos,
    compute_report_task_counts,
)
from labs.api.services.lab_orders_list_service import (
    apply_list_filters,
    base_assignments_queryset,
    parse_list_params,
)
class ReportTaskQueueView(LabReportOperationalMixin):
    """GET paginated operational report task queue (assignment-centric)."""

    pagination_class = ReportTaskCursorPagination

    def get(self, request):
        lab_user, err = self.resolve_lab(request)
        if err:
            return err

        try:
            normalized = _normalize_report_task_query_params(request.query_params)
            params = parse_list_params(normalized)
        except DjangoValidationError as exc:
            return validation_error_response(exc, request=request)
        qs = apply_list_filters(base_assignments_queryset(lab_user), params)
        counts = compute_report_task_counts(list(qs))
        paginator = ReportTaskCursorPagination()
        page = paginator.paginate_queryset(qs, request, view=self)
        assignments = list(page) if page is not None else []
        tasks = [
            ReportTaskSerializer.from_dto(dto).data
            for dto in build_report_task_dtos(assignments)
        ]
        return success_response(
            {
                "results": tasks,
                "next": paginator.get_next_link(),
                "previous": paginator.get_previous_link(),
                "counts": {
                    "pending_uploads": counts.pending_uploads,
                    "ready_delivery": counts.ready_delivery,
                    "delivered": counts.delivered,
                    "failed": counts.failed,
                },
            },
            request=request,
        )


class ReportTaskContextView(LabReportOperationalMixin):
    """GET assignment context + active report heads (upload targets)."""

    def get(self, request, task_id):
        lab_user, err = self.resolve_lab(request)
        if err:
            return err
        try:
            assignment = ReportQueryService.get_lab_assignment_for_branch(
                assignment_id=task_id,
                branch_id=lab_user.branch_id,
            )
        except LabOrderAssignment.DoesNotExist:
            return error_response(
                "Assignment not found.",
                code=error_codes.ASSIGNMENT_NOT_FOUND,
                status=status.HTTP_404_NOT_FOUND,
                request=request,
            )
        order = assignment.diagnostic_order
        for line in order.test_lines.all():
            ArtifactUploadService.create_or_get_report_for_line(
                order_test_line=line,
                uploaded_by=request.user,
            )
        dto = build_report_task_context(assignment)
        payload = ReportTaskContextSerializer.from_dto(dto).data
        return success_response(payload, request=request)


class ReportOperationalArtifactUploadView(LabReportOperationalMixin):
    """POST multipart upload — report_id is the only upload entry (v1)."""

    permission_classes = [IsAuthenticated, CanUploadReports]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, report_id):
        lab_user, err = self.resolve_lab(request)
        if err:
            return err

        report = get_object_or_404(DiagnosticTestReport, pk=report_id)
        if not ReportQueryService.report_belongs_to_branch(
            report=report,
            branch_id=lab_user.branch_id,
        ):
            return error_response(
                "Report not accessible for this branch.",
                code=error_codes.BRANCH_ACCESS_DENIED,
                status=status.HTTP_403_FORBIDDEN,
                request=request,
            )

        files = request.FILES.getlist("files") or []
        if not files and request.FILES.get("file"):
            files = [request.FILES["file"]]
        data = {"files": files, "notes": request.data.get("notes", "")}
        raw_index = request.data.get("primary_file_index")
        if raw_index is not None and str(raw_index).strip() != "":
            data["primary_file_index"] = int(raw_index)
        raw_version = request.data.get("version")
        if raw_version is not None and str(raw_version).strip() != "":
            data["version"] = int(raw_version)

        ser = UploadArtifactRequestSerializer(data=data)
        if not ser.is_valid():
            return error_response(
                str(ser.errors),
                code=error_codes.VALIDATION_FAILED,
                status=status.HTTP_400_BAD_REQUEST,
                request=request,
            )

        validated = ser.validated_data
        version = validated.get("version")
        try:
            artifacts = ArtifactUploadService.upload_report_artifacts(
                report=report,
                uploaded_files=validated["files"],
                uploaded_by=request.user,
                primary_file_index=validated.get("primary_file_index"),
                version=version,
            )
            if report.status == ReportLifecycleStatus.PENDING:
                ReportWorkflowService.mark_in_progress(report, user=request.user)
        except DjangoValidationError as exc:
            return validation_error_response(exc, request=request)

        report.refresh_from_db()
        return success_response(
            {
                "report_id": str(report.id),
                "status": report.status,
                "artifacts": ReportArtifactSerializer(artifacts, many=True).data,
            },
            status=status.HTTP_201_CREATED,
            request=request,
        )


class ReportOperationalDetailView(LabReportOperationalMixin):
    """GET operational report detail (active head only, v1)."""

    permission_classes = [IsAuthenticated, CanViewReportDetail]

    def get(self, request, report_id):
        lab_user, err = self.resolve_lab(request)
        if err:
            return err

        report = get_object_or_404(DiagnosticTestReport, pk=report_id)
        if not ReportQueryService.report_belongs_to_branch(
            report=report,
            branch_id=lab_user.branch_id,
        ):
            return error_response(
                "Report not accessible for this branch.",
                code=error_codes.BRANCH_ACCESS_DENIED,
                status=status.HTTP_403_FORBIDDEN,
                request=request,
            )

        try:
            dto = build_report_detail_dto(report_id)
        except DjangoValidationError as exc:
            message = str(exc)
            if "superseded" in message.lower():
                return error_response(
                    message,
                    code=error_codes.REPORT_SUPERSEDED,
                    status=status.HTTP_404_NOT_FOUND,
                    request=request,
                )
            if "deleted" in message.lower():
                return error_response(
                    message,
                    code=error_codes.REPORT_NOT_FOUND,
                    status=status.HTTP_404_NOT_FOUND,
                    request=request,
                )
            return validation_error_response(exc, request=request)

        payload = ReportDetailSerializer.from_dto(dto).data
        safe_emit(
            emit_report_audit_event,
            action="report_viewed",
            report=report,
            user=request.user,
            metadata={"report_id": str(report.id)},
        )
        return success_response(payload, request=request)


class ReportOperationalDownloadView(LabReportOperationalMixin):
    """GET presigned download URL for primary artifact (v1)."""

    permission_classes = [IsAuthenticated, CanDownloadReports]

    def get(self, request, report_id):
        lab_user, err = self.resolve_lab(request)
        if err:
            return err

        report, err = self.get_report_for_branch(request, report_id, lab_user=lab_user)
        if err:
            return err

        try:
            payload = ReportDownloadService.build_download_response(
                report=report,
                user=request.user,
            )
        except DjangoValidationError as exc:
            return validation_error_response(exc, request=request)

        if not payload.get("download_url") and request.query_params.get("stream") == "1":
            from django.http import FileResponse

            from diagnostics_engine.domain.reports import get_primary_artifact
            from diagnostics_engine.storage.report_storage import ReportStorageService

            artifact = get_primary_artifact(report)
            if artifact is None:
                return validation_error_response(
                    DjangoValidationError("No downloadable artifact."),
                    request=request,
                )
            content = ReportStorageService.open_for_read(artifact)
            filename = ReportStorageService.download_filename(artifact)
            return FileResponse(content, as_attachment=True, filename=filename)

        return success_response(payload, request=request)


def _normalize_report_task_query_params(query_params):
    """
    Normalize compatibility query params for report task queue.

    Notes:
    - `workflow` and `tat_filter` are validated for client contract safety.
    - Assignment-centric queue filtering remains based on q/status/collection/date/urgency.
      Workflow/TAT toggles are currently frontend-applied operational filters.
    """
    params = dict(query_params.items())
    q = (params.get("search") or params.get("q") or "").strip()
    workflow = (params.get("workflow") or "").strip().lower()
    tat_filter = (params.get("tat_filter") or "").strip().lower()
    date_filter = (params.get("date_filter") or "").strip().lower()

    date_from = (params.get("start_date") or params.get("date_from") or "").strip()
    date_to = (params.get("end_date") or params.get("date_to") or "").strip()

    allowed_workflows = {
        "",
        "all",
        "pending_upload",
        "ready_delivery",
        "delivered",
        "failed",
        "awaiting_reports",
        "tat_breached",
        "urgent",
    }
    if workflow not in allowed_workflows:
        raise DjangoValidationError("Invalid workflow filter.")

    allowed_tat_filters = {"", "tat_lt_30m", "tat_breached", "urgent", "priority"}
    if tat_filter not in allowed_tat_filters:
        raise DjangoValidationError("Invalid tat_filter value.")

    if date_filter and date_filter not in {"today", "tomorrow", "this_week", "this_month", "custom"}:
        raise DjangoValidationError("Invalid date_filter value.")

    if date_filter and date_filter != "custom" and (not date_from and not date_to):
        today = timezone.localdate()
        if date_filter == "today":
            date_from = today.isoformat()
            date_to = today.isoformat()
        elif date_filter == "tomorrow":
            day = today + timedelta(days=1)
            date_from = day.isoformat()
            date_to = day.isoformat()
        elif date_filter == "this_week":
            start = today - timedelta(days=today.weekday())
            end = start + timedelta(days=6)
            date_from = start.isoformat()
            date_to = end.isoformat()
        elif date_filter == "this_month":
            start = today.replace(day=1)
            if start.month == 12:
                next_month = date(start.year + 1, 1, 1)
            else:
                next_month = date(start.year, start.month + 1, 1)
            end = next_month - timedelta(days=1)
            date_from = start.isoformat()
            date_to = end.isoformat()

    parsed_from = _parse_iso_date(date_from) if date_from else None
    parsed_to = _parse_iso_date(date_to) if date_to else None
    if parsed_from and parsed_to and parsed_from > parsed_to:
        raise DjangoValidationError("start_date cannot be after end_date.")

    ordering = (params.get("ordering") or "-assigned_at").strip()
    return {
        "q": q,
        "status": params.get("status"),
        "collection_type": params.get("collection_type"),
        "urgency": params.get("urgency"),
        "date_from": parsed_from.isoformat() if parsed_from else "",
        "date_to": parsed_to.isoformat() if parsed_to else "",
        "ordering": ordering,
        "page_size": params.get("page_size"),
        "cursor": params.get("cursor"),
    }


def _parse_iso_date(value: str) -> date:
    try:
        return datetime.fromisoformat(value).date() if "T" in value else date.fromisoformat(value)
    except ValueError as exc:
        raise DjangoValidationError(f"Invalid date value: {value}") from exc

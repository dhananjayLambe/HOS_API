"""Operational report views (v1 contract) — thin views, service-driven."""

from __future__ import annotations

from datetime import date, datetime, timedelta

from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.cache import cache
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
from diagnostics_engine.domain.reports import get_primary_artifact
from diagnostics_engine.permissions.reports import (
    CanCorrectReports,
    CanDownloadReports,
    CanUploadReports,
    CanViewReportDetail,
)
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
    filter_assignments_ready_for_report_queue,
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
        qs = filter_assignments_ready_for_report_queue(qs)
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
        # Re-fetch so newly provisioned report heads are visible (prefetch cache is stale).
        assignment = ReportQueryService.get_lab_assignment_for_branch(
            assignment_id=task_id,
            branch_id=lab_user.branch_id,
        )
        dto = build_report_task_context(assignment)
        payload = ReportTaskContextSerializer.from_dto(dto).data
        return success_response(payload, request=request)


class ReportOperationalArtifactUploadView(LabReportOperationalMixin):
    """POST multipart upload — report_id is the only upload entry (v1)."""

    permission_classes = [IsAuthenticated, CanUploadReports]
    parser_classes = [MultiPartParser, FormParser]
    _UPLOAD_INTENTS = {"UPLOAD_NEW", "REUPLOAD_REPLACE"}

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
            try:
                data["primary_file_index"] = int(raw_index)
            except (TypeError, ValueError):
                return error_response(
                    "primary_file_index must be an integer.",
                    code=error_codes.VALIDATION_FAILED,
                    status=status.HTTP_400_BAD_REQUEST,
                    request=request,
                )
        raw_version = request.data.get("version")
        if raw_version is not None and str(raw_version).strip() != "":
            try:
                data["version"] = int(raw_version)
            except (TypeError, ValueError):
                return error_response(
                    "version must be an integer.",
                    code=error_codes.VALIDATION_FAILED,
                    status=status.HTTP_400_BAD_REQUEST,
                    request=request,
                )

        upload_intent = str(request.data.get("upload_intent") or "").strip().upper()
        legacy_mode = str(request.data.get("mode") or "").strip().lower()
        if not upload_intent and legacy_mode:
            upload_intent = "REUPLOAD_REPLACE" if legacy_mode == "reupload" else "UPLOAD_NEW"
        if not upload_intent:
            upload_intent = "UPLOAD_NEW"
        if upload_intent not in self._UPLOAD_INTENTS:
            return error_response(
                "Unsupported upload_intent.",
                code=error_codes.INVALID_UPLOAD_INTENT,
                status=status.HTTP_400_BAD_REQUEST,
                request=request,
            )

        upload_request_id = str(request.data.get("upload_request_id") or request.headers.get("Idempotency-Key") or "").strip()
        if upload_request_id:
            key = f"diagnostics:upload:req:{report.id}:{upload_request_id}"
            if not cache.add(key, "1", timeout=120):
                return error_response(
                    "Duplicate upload request.",
                    code=error_codes.IDEMPOTENCY_CONFLICT,
                    status=status.HTTP_409_CONFLICT,
                    request=request,
                )

        if report.order_test_line_id is None or getattr(report.order_test_line, "order_id", None) is None:
            return error_response(
                "Report ownership linkage is invalid.",
                code=error_codes.REPORT_OWNERSHIP_MISMATCH,
                status=status.HTTP_400_BAD_REQUEST,
                request=request,
            )
        if report.artifacts.filter(
            is_active=True,
            artifact_state__in=["archived", "quarantine", "deleted"],
        ).exists():
            return error_response(
                "Report has blocked artifact state for upload.",
                code=error_codes.REPORT_NOT_READY,
                status=status.HTTP_400_BAD_REQUEST,
                request=request,
            )

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
        is_reupload = upload_intent == "REUPLOAD_REPLACE"
        if is_reupload and not CanCorrectReports().has_permission(request, self):
            return error_response(
                "You do not have permission to correct reports.",
                code=error_codes.PERMISSION_DENIED,
                status=status.HTTP_403_FORBIDDEN,
                request=request,
            )
        try:
            if is_reupload:
                files = validated["files"]
                if len(files) != 1:
                    return error_response(
                        "Re-upload supports exactly one file.",
                        code=error_codes.MULTI_FILE_REUPLOAD_NOT_ALLOWED,
                        status=status.HTTP_400_BAD_REQUEST,
                        request=request,
                    )
                notes = str(validated.get("notes") or "").strip()
                if not notes:
                    return error_response(
                        "Re-upload reason is required.",
                        code=error_codes.REUPLOAD_REASON_REQUIRED,
                        status=status.HTTP_400_BAD_REQUEST,
                        request=request,
                    )
                old_artifact = get_primary_artifact(report) or report.artifacts.filter(is_active=True).order_by("-uploaded_at").first()
                if old_artifact is None:
                    return error_response(
                        "Re-upload requires an existing active artifact.",
                        code=error_codes.REPORT_NOT_READY,
                        status=status.HTTP_400_BAD_REQUEST,
                        request=request,
                    )
                replaced = ArtifactUploadService.replace_artifact(
                    report=report,
                    old_artifact=old_artifact,
                    file=files[0],
                    uploaded_by=request.user,
                    reupload_reason=notes,
                )
                artifacts = [replaced]
                safe_emit(
                    emit_report_audit_event,
                    action="report_reuploaded",
                    report=report,
                    user=request.user,
                    metadata={
                        "upload_request_id": upload_request_id or None,
                        "reason": notes,
                        "old_version": getattr(old_artifact, "version", None),
                        "new_version": getattr(replaced, "version", None),
                        "old_artifact_id": str(old_artifact.id),
                        "new_artifact_id": str(replaced.id),
                    },
                )
            else:
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
                "last_reupload_reason": report.last_reupload_reason,
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

        payload = ReportDetailSerializer.from_dto(dto, context={"request": request}).data
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
            inline = request.query_params.get("inline") == "1"
            return FileResponse(content, as_attachment=not inline, filename=filename)

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

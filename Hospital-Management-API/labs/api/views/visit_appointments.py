"""Visit appointment list and workflow actions."""

from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from labs.api.helpers.visit_workflow_api import run_visit_workflow_action
from labs.api.pagination import LabOrdersPageNumberPagination
from labs.api.permissions import IsLabAdminUser
from labs.api.serializers.visit_appointments import (
    VisitAppointmentListItemSerializer,
    VisitAppointmentsSummarySerializer,
    VisitCheckInSerializer,
    VisitCompleteSerializer,
    VisitConfirmSerializer,
    VisitMarkNoShowSerializer,
    VisitRescheduleSerializer,
    visit_list_dto_to_representation,
)
from labs.api.services.lab_session_resolver import LabSessionDenied, require_lab_operational_access
from labs.api.services.visit_appointments_list_service import (
    apply_list_filters,
    apply_ordering,
    base_visit_queryset,
    build_row_dtos,
    build_summary_counts,
    parse_list_params,
)
from labs.services.visit_workflow import (
    check_in_visit,
    complete_visit,
    confirm_visit,
    mark_no_show,
    reschedule_visit,
)


class VisitAppointmentsListView(APIView):
    permission_classes = [IsAuthenticated, IsLabAdminUser]
    pagination_class = LabOrdersPageNumberPagination

    def get(self, request):
        resolved = require_lab_operational_access(request)
        if isinstance(resolved, LabSessionDenied):
            return resolved.response

        params = parse_list_params(request.query_params)
        qs = apply_ordering(
            apply_list_filters(base_visit_queryset(resolved.lab_user), params),
            params,
        )

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(qs, request, view=self)
        visits = list(page) if page is not None else []
        rows = build_row_dtos(visits)
        data = VisitAppointmentListItemSerializer(
            [visit_list_dto_to_representation(row) for row in rows],
            many=True,
        ).data
        return paginator.get_paginated_response(data)


class VisitAppointmentsSummaryView(APIView):
    permission_classes = [IsAuthenticated, IsLabAdminUser]

    def get(self, request):
        resolved = require_lab_operational_access(request)
        if isinstance(resolved, LabSessionDenied):
            return resolved.response

        preset = (request.query_params.get("date_preset") or "today").strip().lower()
        counts = build_summary_counts(resolved.lab_user, date_preset=preset)
        return Response(VisitAppointmentsSummarySerializer(counts).data)


class VisitAppointmentConfirmView(APIView):
    permission_classes = [IsAuthenticated, IsLabAdminUser]

    def post(self, request, visit_id):
        resolved = require_lab_operational_access(request)
        if isinstance(resolved, LabSessionDenied):
            return resolved.response

        serializer = VisitConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        return run_visit_workflow_action(
            action=lambda: confirm_visit(visit_id=visit_id, lab_user=resolved.lab_user),
            message="Appointment confirmed.",
        )


class VisitAppointmentCheckInView(APIView):
    permission_classes = [IsAuthenticated, IsLabAdminUser]

    def post(self, request, visit_id):
        resolved = require_lab_operational_access(request)
        if isinstance(resolved, LabSessionDenied):
            return resolved.response

        serializer = VisitCheckInSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        return run_visit_workflow_action(
            action=lambda: check_in_visit(visit_id=visit_id, lab_user=resolved.lab_user),
            message="Patient checked in.",
        )


class VisitAppointmentCompleteView(APIView):
    permission_classes = [IsAuthenticated, IsLabAdminUser]

    def post(self, request, visit_id):
        resolved = require_lab_operational_access(request)
        if isinstance(resolved, LabSessionDenied):
            return resolved.response

        serializer = VisitCompleteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        return run_visit_workflow_action(
            action=lambda: complete_visit(visit_id=visit_id, lab_user=resolved.lab_user),
            message="Visit marked complete.",
        )


class VisitAppointmentNoShowView(APIView):
    permission_classes = [IsAuthenticated, IsLabAdminUser]

    def post(self, request, visit_id):
        resolved = require_lab_operational_access(request)
        if isinstance(resolved, LabSessionDenied):
            return resolved.response

        serializer = VisitMarkNoShowSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        reason = serializer.validated_data.get("reason") or ""
        return run_visit_workflow_action(
            action=lambda: mark_no_show(
                visit_id=visit_id,
                lab_user=resolved.lab_user,
                reason=reason,
            ),
            message="Marked as no show.",
        )


class VisitAppointmentRescheduleView(APIView):
    permission_classes = [IsAuthenticated, IsLabAdminUser]

    def post(self, request, visit_id):
        resolved = require_lab_operational_access(request)
        if isinstance(resolved, LabSessionDenied):
            return resolved.response

        serializer = VisitRescheduleSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        validated = serializer.validated_data
        return run_visit_workflow_action(
            action=lambda: reschedule_visit(
                visit_id=visit_id,
                lab_user=resolved.lab_user,
                appointment_date=validated.get("appointment_date"),
                appointment_slot=validated.get("appointment_slot"),
            ),
            message="Appointment rescheduled.",
        )

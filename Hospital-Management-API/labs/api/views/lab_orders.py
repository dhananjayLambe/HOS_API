"""
Lab dashboard order register — branch-scoped list for Phase 1.

GET /api/labs/orders/
"""

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from labs.api.pagination import LabOrdersPageNumberPagination
from labs.api.permissions import IsLabAdminUser
from labs.api.serializers.lab_orders_list import LabOrderListItemSerializer, dto_to_representation
from labs.api.services.lab_orders_list_service import (
    apply_list_filters,
    base_assignments_queryset,
    build_row_dtos,
    parse_list_params,
)
from labs.api.services.lab_session_resolver import LabSessionDenied, resolve_lab_user


class LabOrdersListView(APIView):
    permission_classes = [IsAuthenticated, IsLabAdminUser]
    pagination_class = LabOrdersPageNumberPagination

    def get(self, request):
        resolved = resolve_lab_user(request)
        if isinstance(resolved, LabSessionDenied):
            return resolved.response

        params = parse_list_params(request.query_params)
        qs = apply_list_filters(base_assignments_queryset(resolved.lab_user), params)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(qs, request, view=self)
        assignments = list(page) if page is not None else []
        rows = build_row_dtos(assignments)
        data = LabOrderListItemSerializer(
            [dto_to_representation(row) for row in rows],
            many=True,
        ).data
        return paginator.get_paginated_response(data)


class LabOrderAssignmentDetailView(APIView):
    """
    GET /api/labs/orders/assignments/<assignment_id>/

    Deterministic assignment row for operational drawers (reports queue View order).
    Branch-scoped; 404 when assignment is outside the lab user's branch.
    """

    permission_classes = [IsAuthenticated, IsLabAdminUser]

    def get(self, request, assignment_id):
        resolved = resolve_lab_user(request)
        if isinstance(resolved, LabSessionDenied):
            return resolved.response

        assignment = (
            base_assignments_queryset(resolved.lab_user)
            .filter(pk=assignment_id)
            .first()
        )
        if assignment is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        row = build_row_dtos([assignment])[0]
        data = LabOrderListItemSerializer(dto_to_representation(row)).data
        return Response(data, status=status.HTTP_200_OK)

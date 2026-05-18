"""Operational diagnostics catalog — read-only pricing visibility APIs."""

from __future__ import annotations

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from labs.api.pagination import PricingCatalogPageNumberPagination
from labs.api.permissions import IsLabAdminUser
from labs.api.serializers.pricing_catalog import (
    package_dto_to_representation,
    service_dto_to_representation,
    summary_dto_to_representation,
)
from labs.api.services.lab_session_resolver import LabSessionDenied, resolve_lab_user
from labs.api.services.pricing_catalog_list_service import (
    PricingCatalogQueryError,
    apply_package_filters,
    apply_service_filters,
    base_package_pricing_queryset,
    base_service_pricing_queryset,
    build_package_row_dtos,
    build_service_row_dtos,
    parse_package_list_params,
    parse_service_list_params,
)
from labs.api.services.pricing_catalog_summary_service import build_pricing_summary


def _bad_query_response(exc: PricingCatalogQueryError) -> Response:
    return Response({"detail": exc.detail}, status=400)


class PricingCatalogSummaryView(APIView):
    permission_classes = [IsAuthenticated, IsLabAdminUser]

    def get(self, request):
        resolved = resolve_lab_user(request)
        if isinstance(resolved, LabSessionDenied):
            return resolved.response

        summary = build_pricing_summary(resolved.lab_user.branch_id)
        return Response(summary_dto_to_representation(summary))


class PricingServicesListView(APIView):
    permission_classes = [IsAuthenticated, IsLabAdminUser]
    pagination_class = PricingCatalogPageNumberPagination

    def get(self, request):
        resolved = resolve_lab_user(request)
        if isinstance(resolved, LabSessionDenied):
            return resolved.response

        try:
            params = parse_service_list_params(request.query_params)
        except PricingCatalogQueryError as exc:
            return _bad_query_response(exc)

        qs = apply_service_filters(
            base_service_pricing_queryset(resolved.lab_user.branch_id),
            params,
        )

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(qs, request, view=self)
        rows = list(page) if page is not None else []
        dtos = build_service_row_dtos(rows)
        data = [service_dto_to_representation(dto) for dto in dtos]
        return paginator.get_paginated_response(data)


class PricingPackagesListView(APIView):
    permission_classes = [IsAuthenticated, IsLabAdminUser]
    pagination_class = PricingCatalogPageNumberPagination

    def get(self, request):
        resolved = resolve_lab_user(request)
        if isinstance(resolved, LabSessionDenied):
            return resolved.response

        try:
            params = parse_package_list_params(request.query_params)
        except PricingCatalogQueryError as exc:
            return _bad_query_response(exc)

        qs = apply_package_filters(
            base_package_pricing_queryset(resolved.lab_user.branch_id),
            params,
        )

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(qs, request, view=self)
        rows = list(page) if page is not None else []
        dtos = build_package_row_dtos(rows)
        data = [package_dto_to_representation(dto) for dto in dtos]
        return paginator.get_paginated_response(data)

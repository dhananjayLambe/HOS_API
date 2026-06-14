"""Helpdesk clinical visits list, detail, and dashboard summary."""

from __future__ import annotations

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from account.permissions import IsHelpdeskOrAdmin
from consultations_core.api.pagination import ClinicalVisitsPageNumberPagination
from consultations_core.api.serializers.clinical_visits import (
    ClinicalVisitDetailSerializer,
    ClinicalVisitListItemSerializer,
    ClinicalVisitsDashboardSummarySerializer,
)
from consultations_core.api.services.clinical_visits_list_service import (
    apply_list_filters,
    apply_ordering,
    base_encounters_queryset,
    build_dashboard_summary,
    encounter_in_user_scope,
    parse_list_params,
    resolve_clinic_ids_for_user,
)
from consultations_core.api.services.clinical_visits_presenter import (
    build_clinical_visit_detail_payload,
    build_clinical_visit_list_row_dto,
    list_row_dto_to_representation,
)
from consultations_core.models.encounter import ClinicalEncounter


class _ClinicalVisitsAccessMixin:
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsHelpdeskOrAdmin]

    def _clinic_ids(self, request):
        return resolve_clinic_ids_for_user(request.user)


class ClinicalVisitsListView(_ClinicalVisitsAccessMixin, APIView):
    pagination_class = ClinicalVisitsPageNumberPagination

    def get(self, request):
        clinic_ids = self._clinic_ids(request)
        if clinic_ids is not None and not clinic_ids:
            paginator = self.pagination_class()
            empty = paginator.get_paginated_response([])
            return empty

        params = parse_list_params(request.query_params)
        qs = apply_ordering(
            apply_list_filters(base_encounters_queryset(clinic_ids=clinic_ids), params),
            params,
        )

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(qs, request, view=self)
        encounters = list(page) if page is not None else []
        rows = [build_clinical_visit_list_row_dto(enc) for enc in encounters]
        data = ClinicalVisitListItemSerializer(
            [list_row_dto_to_representation(row) for row in rows],
            many=True,
        ).data
        return paginator.get_paginated_response(data)


class ClinicalVisitDetailView(_ClinicalVisitsAccessMixin, APIView):
    def get(self, request, visit_id):
        clinic_ids = self._clinic_ids(request)
        if clinic_ids is not None and not clinic_ids:
            return Response(
                {"detail": "No helpdesk clinic assignment for this user."},
                status=status.HTTP_403_FORBIDDEN,
            )

        encounter = get_object_or_404(
            ClinicalEncounter.objects.select_related(
                "doctor",
                "doctor__user",
                "patient_profile",
                "patient_profile__account",
                "patient_profile__account__user",
                "consultation",
            ).prefetch_related(
                "consultation__prescriptions",
            ),
            pk=visit_id,
        )
        if not encounter_in_user_scope(encounter, clinic_ids):
            return Response({"detail": "Visit not found."}, status=status.HTTP_404_NOT_FOUND)

        payload = build_clinical_visit_detail_payload(encounter)
        return Response(ClinicalVisitDetailSerializer(payload).data, status=status.HTTP_200_OK)


class ClinicalVisitsDashboardSummaryView(_ClinicalVisitsAccessMixin, APIView):
    def get(self, request):
        clinic_ids = self._clinic_ids(request)
        if clinic_ids is not None and not clinic_ids:
            return Response(
                ClinicalVisitsDashboardSummarySerializer(
                    {"today_visits": 0, "completed_visits": 0, "followups": 0},
                ).data,
                status=status.HTTP_200_OK,
            )

        counts = build_dashboard_summary(clinic_ids=clinic_ids)
        return Response(ClinicalVisitsDashboardSummarySerializer(counts).data, status=status.HTTP_200_OK)

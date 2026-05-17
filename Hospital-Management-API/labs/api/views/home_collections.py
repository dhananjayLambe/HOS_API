"""Home collections dashboard — list, summary, workflow actions."""

from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from labs.api.pagination import LabOrdersPageNumberPagination
from labs.api.permissions import IsLabAdminUser
from labs.api.serializers.home_collections import (
    HomeCollectionAssignSerializer,
    HomeCollectionFailSerializer,
    HomeCollectionListItemSerializer,
    HomeCollectionsSummarySerializer,
    PhlebotomistListItemSerializer,
    dto_to_representation,
)
from labs.api.services.home_collections_list_service import (
    apply_list_filters,
    base_collections_queryset,
    build_row_dtos,
    build_summary_counts,
    parse_list_params,
)
from labs.api.services.lab_session_resolver import LabSessionDenied, resolve_lab_user
from labs.choices.auth import LabUserRole
from labs.models import LabUser
from labs.services.collection_workflow import (
    CollectionNotFoundError,
    CollectionWorkflowError,
    PhlebotomistNotFoundError,
    allowed_actions_for_status,
    assign_collection_by_id,
    mark_collected,
    mark_failed,
    retry_collection,
    start_collection,
)


def _workflow_response(collection, *, message: str) -> dict:
    return {
        "success": True,
        "collection_status": collection.collection_status,
        "message": message,
        "collection_id": str(collection.id),
        "allowed_actions": allowed_actions_for_status(collection.collection_status),
    }


class HomeCollectionsListView(APIView):
    permission_classes = [IsAuthenticated, IsLabAdminUser]
    pagination_class = LabOrdersPageNumberPagination

    def get(self, request):
        resolved = resolve_lab_user(request)
        if isinstance(resolved, LabSessionDenied):
            return resolved.response

        params = parse_list_params(request.query_params)
        qs = apply_list_filters(base_collections_queryset(resolved.lab_user), params)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(qs, request, view=self)
        collections = list(page) if page is not None else []
        rows = build_row_dtos(collections)
        data = HomeCollectionListItemSerializer(
            [dto_to_representation(row) for row in rows],
            many=True,
        ).data
        return paginator.get_paginated_response(data)


class HomeCollectionsSummaryView(APIView):
    permission_classes = [IsAuthenticated, IsLabAdminUser]

    def get(self, request):
        resolved = resolve_lab_user(request)
        if isinstance(resolved, LabSessionDenied):
            return resolved.response

        preset = (request.query_params.get("date_preset") or "today").strip().lower()
        counts = build_summary_counts(resolved.lab_user, date_preset=preset)
        return Response(HomeCollectionsSummarySerializer(counts).data)


class PhlebotomistsListView(APIView):
    permission_classes = [IsAuthenticated, IsLabAdminUser]

    def get(self, request):
        resolved = resolve_lab_user(request)
        if isinstance(resolved, LabSessionDenied):
            return resolved.response

        users = (
            LabUser.objects.filter(
                branch_id=resolved.lab_user.branch_id,
                is_deleted=False,
                is_active=True,
                role=LabUserRole.PHLEBOTOMIST,
            )
            .select_related("user")
            .order_by("user__first_name", "user__last_name")
        )
        items = []
        for lu in users:
            u = lu.user
            name = u.get_full_name().strip() or u.username
            items.append({"id": str(lu.id), "name": name, "role": lu.role})
        return Response(PhlebotomistListItemSerializer(items, many=True).data)


class HomeCollectionAssignView(APIView):
    permission_classes = [IsAuthenticated, IsLabAdminUser]

    def post(self, request, collection_id):
        resolved = resolve_lab_user(request)
        if isinstance(resolved, LabSessionDenied):
            return resolved.response

        serializer = HomeCollectionAssignSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            collection = assign_collection_by_id(
                collection_id=collection_id,
                lab_user=resolved.lab_user,
                phlebotomist_id=serializer.validated_data["phlebotomist_id"],
            )
        except PhlebotomistNotFoundError:
            return Response({"detail": "Phlebotomist not found."}, status=status.HTTP_404_NOT_FOUND)
        except CollectionNotFoundError:
            return Response({"detail": "Collection not found."}, status=status.HTTP_404_NOT_FOUND)
        except CollectionWorkflowError as exc:
            return Response({"detail": exc.message}, status=status.HTTP_409_CONFLICT)

        return Response(
            _workflow_response(collection, message="Phlebotomist assigned."),
            status=status.HTTP_200_OK,
        )


class HomeCollectionStartView(APIView):
    permission_classes = [IsAuthenticated, IsLabAdminUser]

    def post(self, request, collection_id):
        resolved = resolve_lab_user(request)
        if isinstance(resolved, LabSessionDenied):
            return resolved.response

        try:
            collection = start_collection(collection_id=collection_id, lab_user=resolved.lab_user)
        except CollectionNotFoundError:
            return Response({"detail": "Collection not found."}, status=status.HTTP_404_NOT_FOUND)
        except CollectionWorkflowError as exc:
            return Response({"detail": exc.message}, status=status.HTTP_409_CONFLICT)

        return Response(
            _workflow_response(collection, message="Collection started."),
            status=status.HTTP_200_OK,
        )


class HomeCollectionCollectView(APIView):
    permission_classes = [IsAuthenticated, IsLabAdminUser]

    def post(self, request, collection_id):
        resolved = resolve_lab_user(request)
        if isinstance(resolved, LabSessionDenied):
            return resolved.response

        try:
            collection = mark_collected(collection_id=collection_id, lab_user=resolved.lab_user)
        except CollectionNotFoundError:
            return Response({"detail": "Collection not found."}, status=status.HTTP_404_NOT_FOUND)
        except CollectionWorkflowError as exc:
            return Response({"detail": exc.message}, status=status.HTTP_409_CONFLICT)

        return Response(
            _workflow_response(collection, message="Sample marked collected."),
            status=status.HTTP_200_OK,
        )


class HomeCollectionFailView(APIView):
    permission_classes = [IsAuthenticated, IsLabAdminUser]

    def post(self, request, collection_id):
        resolved = resolve_lab_user(request)
        if isinstance(resolved, LabSessionDenied):
            return resolved.response

        serializer = HomeCollectionFailSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        reason = serializer.validated_data.get("reason") or ""

        try:
            collection = mark_failed(
                collection_id=collection_id,
                lab_user=resolved.lab_user,
                reason=reason,
            )
        except CollectionNotFoundError:
            return Response({"detail": "Collection not found."}, status=status.HTTP_404_NOT_FOUND)
        except CollectionWorkflowError as exc:
            return Response({"detail": exc.message}, status=status.HTTP_409_CONFLICT)

        return Response(
            _workflow_response(collection, message="Collection marked failed."),
            status=status.HTTP_200_OK,
        )


class HomeCollectionRetryView(APIView):
    permission_classes = [IsAuthenticated, IsLabAdminUser]

    def post(self, request, collection_id):
        resolved = resolve_lab_user(request)
        if isinstance(resolved, LabSessionDenied):
            return resolved.response

        try:
            collection = retry_collection(collection_id=collection_id, lab_user=resolved.lab_user)
        except CollectionNotFoundError:
            return Response({"detail": "Collection not found."}, status=status.HTTP_404_NOT_FOUND)
        except CollectionWorkflowError as exc:
            return Response({"detail": exc.message}, status=status.HTTP_409_CONFLICT)

        return Response(
            _workflow_response(collection, message="Collection returned to pending queue."),
            status=status.HTTP_200_OK,
        )

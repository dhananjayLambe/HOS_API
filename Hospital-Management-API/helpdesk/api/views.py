from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from account.permissions import IsDoctor
from .serializers import HelpdeskCreateSerializer, HelpdeskListSerializer
from .services import (
    create_helpdesk_user,
    list_helpdesk_users,
    remove_helpdesk_user
)
import logging

from django.core.exceptions import ValidationError

logger = logging.getLogger(__name__)


class CreateHelpdeskAPIView(APIView):
    permission_classes = [IsAuthenticated, IsDoctor]

    def post(self, request):
        serializer = HelpdeskCreateSerializer(data=request.data)

        if serializer.is_valid():
            try:
                create_helpdesk_user(
                    user=request.user,
                    clinic_id=serializer.validated_data["clinic_id"],
                    first_name=serializer.validated_data["first_name"],
                    last_name=serializer.validated_data["last_name"],
                    mobile=serializer.validated_data["mobile"],
                )

                return Response(
                    {"message": "Helpdesk user created successfully"},
                    status=status.HTTP_201_CREATED,
                )

            except ValidationError as e:
                return Response(
                    {"error": str(e)},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            except Exception:
                logger.exception("CreateHelpdeskAPIView failed")
                return Response(
                    {"error": "Something went wrong"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ListHelpdeskAPIView(APIView):
    permission_classes = [IsAuthenticated, IsDoctor]

    def get(self, request):
        clinic_id = request.GET.get("clinic_id")

        if not clinic_id:
            return Response(
                {"error": "clinic_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            queryset = list_helpdesk_users(request.user, clinic_id)
            data = HelpdeskListSerializer(queryset, many=True).data

            return Response(data, status=status.HTTP_200_OK)

        except ValidationError as e:
            return Response({"error": str(e)}, status=400)


class DeleteHelpdeskAPIView(APIView):
    permission_classes = [IsAuthenticated, IsDoctor]

    def delete(self, request, pk):
        try:
            remove_helpdesk_user(request.user, pk)

            return Response(
                {"message": "Helpdesk user removed successfully"},
                status=status.HTTP_200_OK
            )

        except ValidationError as e:
            return Response({"error": str(e)}, status=400)
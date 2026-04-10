from django.shortcuts import get_object_or_404
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from account.permissions import IsDoctor
from consultations_core.models import ClinicalEncounter
from diagnostics_engine.api.serializers.suggestions import (
    InvestigationSuggestionsQuerySerializer,
    InvestigationSuggestionsResponseSerializer,
)
from diagnostics_engine.services.investigation_suggestions import InvestigationSuggestionEngine


class InvestigationSuggestionsAPIView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter(
                "encounter_id",
                openapi.IN_QUERY,
                description="Clinical encounter UUID",
                type=openapi.TYPE_STRING,
                format=openapi.FORMAT_UUID,
                required=True,
            )
        ],
        responses={200: InvestigationSuggestionsResponseSerializer},
    )
    def get(self, request):
        query_serializer = InvestigationSuggestionsQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=True)
        encounter = get_object_or_404(ClinicalEncounter, id=query_serializer.validated_data["encounter_id"])

        doctor_profile = getattr(request.user, "doctor", None)
        if not doctor_profile or encounter.doctor_id != doctor_profile.id:
            raise PermissionDenied("You are not allowed to access this encounter.")

        payload = InvestigationSuggestionEngine(encounter).run()
        response_serializer = InvestigationSuggestionsResponseSerializer(data=payload)
        response_serializer.is_valid(raise_exception=True)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


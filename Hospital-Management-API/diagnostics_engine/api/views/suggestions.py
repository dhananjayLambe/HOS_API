from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from account.permissions import IsDoctor
from consultations_core.models import ClinicalEncounter
from diagnostics_engine.services.investigation_suggestions import InvestigationSuggestionEngine


class InvestigationSuggestionsAPIView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def get(self, request):
        encounter_id = request.query_params.get("encounter_id")
        if not encounter_id:
            return Response(
                {"detail": "encounter_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        encounter = get_object_or_404(ClinicalEncounter, id=encounter_id)
        payload = InvestigationSuggestionEngine(encounter).run()
        return Response(payload, status=status.HTTP_200_OK)


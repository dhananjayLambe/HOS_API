"""GET /api/diagnostics/search/ — fuzzy catalog search for tests and packages."""

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from diagnostics_engine.api.serializers.search import InvestigationSearchQuerySerializer
from diagnostics_engine.services.search import run_investigation_search


class InvestigationSearchView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        serializer = InvestigationSearchQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        data = run_investigation_search(
            serializer.validated_data["q_normalized"],
            serializer.validated_data["type"],
            serializer.validated_data["limit"],
        )
        return Response(data)

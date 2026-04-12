# consultations_core/api/views/instruction_suggestions.py
import logging

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from account.permissions import IsDoctor
from consultations_core.api.serializers.instructions import InstructionSuggestionQuerySerializer
from consultations_core.services.instruction_suggestion_service import get_instruction_suggestions

logger = logging.getLogger(__name__)


def _parse_exclude_from_query(query_params) -> list:
    """Supports ?exclude=a&exclude=b and ?exclude=a,b."""
    vals = query_params.getlist("exclude")
    if len(vals) == 1 and "," in vals[0]:
        return [x.strip() for x in vals[0].split(",") if x.strip()]
    return [x.strip() for x in vals if x.strip()]


class InstructionSuggestionsAPIView(APIView):
    """
    GET /api/consultations/instructions/suggestions/
    Template-driven suggestions from JSON metadata (no DB per request).
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def get(self, request):
        qp = request.query_params
        payload = {
            "q": qp.get("q", ""),
            "specialty": qp.get("specialty", ""),
            "category": qp.get("category", ""),
            "limit": qp.get("limit", 20),
            "exclude": _parse_exclude_from_query(qp),
        }
        ser = InstructionSuggestionQuerySerializer(data=payload)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

        v = ser.validated_data
        try:
            result = get_instruction_suggestions(
                q=v.get("q") or "",
                specialty=v.get("specialty") or "",
                category=v.get("category") or "",
                limit=v["limit"],
                exclude=v.get("exclude") or [],
            )
        except FileNotFoundError as e:
            logger.exception("Instruction suggestion metadata missing: %s", e)
            return Response(
                {"detail": "Instruction metadata not available."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "success": True,
                "data": result["data"],
                "meta": result["meta"],
            }
        )

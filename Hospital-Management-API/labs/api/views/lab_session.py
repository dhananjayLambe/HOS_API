"""
Authenticated lab session — single payload for lab dashboard.

GET /api/labs/me/
"""

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from labs.api.permissions import IsLabAdminUser
from labs.api.serializers.lab_session_serializer import LabSessionSerializer
from labs.api.services.lab_session_resolver import LabSessionDenied, resolve_lab_user


class LabSessionView(APIView):
    permission_classes = [IsAuthenticated, IsLabAdminUser]

    def get(self, request):
        resolved = resolve_lab_user(request)
        if isinstance(resolved, LabSessionDenied):
            return resolved.response

        serializer = LabSessionSerializer(resolved.lab_user, context={"request": request})
        return Response(serializer.data)

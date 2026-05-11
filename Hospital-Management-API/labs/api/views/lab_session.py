"""
Authenticated lab session — single payload for lab dashboard.

GET /api/labs/me/
"""

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from labs.api.serializers.lab_session_serializer import LabSessionSerializer
from labs.models import LabUser


class LabSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not user.groups.filter(name="labadmin").exists():
            return Response(
                {"detail": "You do not have permission to access the lab session."},
                status=403,
            )

        lab_user = (
            LabUser.objects.filter(user=user)
            .select_related("user", "organization", "branch", "branch__address")
            .order_by("-is_primary_admin", "created_at")
            .first()
        )
        if lab_user is None:
            return Response(
                {"detail": "No lab user profile is linked to this account."},
                status=403,
            )

        serializer = LabSessionSerializer(lab_user, context={"request": request})
        return Response(serializer.data)

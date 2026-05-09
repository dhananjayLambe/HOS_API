"""
Public lab self-registration (pending admin approval).

POST /api/labs/onboarding/ — thin view: serializer validates, service persists.

Login policy: User is created with is_active=False and status=False; Django group labadmin.
Staff OTP (labadmin role) is blocked until admin sets is_active=True; org stays PENDING until approved.
"""

import logging

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from labs.api.serializers.lab_onboarding_serializer import LabOnboardingSerializer
from labs.api.services.lab_onboarding_service import register_lab

logger = logging.getLogger(__name__)


class LabOnboardingView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LabOnboardingSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {
                    "success": False,
                    "message": "Validation failed.",
                    "errors": serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = register_lab(validated_data=serializer.validated_data)
        except ValueError as exc:
            return Response(
                {"success": False, "message": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception:
            logger.exception("LabOnboardingView failed")
            return Response(
                {"success": False, "message": "Registration could not be completed. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "success": True,
                "message": "Lab registration submitted successfully.",
                "registration_status": result["registration_status"],
                "organization_id": result["organization_id"],
                "branch_id": result["branch_id"],
                "user_id": result.get("user_id"),
                "documents_uploaded": result.get("documents_uploaded", 0),
            },
            status=status.HTTP_201_CREATED,
        )

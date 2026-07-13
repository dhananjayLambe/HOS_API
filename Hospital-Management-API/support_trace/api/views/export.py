"""Export API stubs."""

from __future__ import annotations

from rest_framework.views import APIView

from support_trace.api.context import SupportInvestigationContext
from support_trace.api.permissions import SupportInvestigationPermission
from support_trace.api.response_builder import SupportResponseBuilder
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication


class ExportCreateView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, SupportInvestigationPermission]

    def post(self, request):
        ctx = SupportInvestigationContext.from_request(request)
        return SupportResponseBuilder.not_implemented(
            "Export not yet implemented",
            request=request,
            ctx=ctx,
        )


class ExportStatusView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, SupportInvestigationPermission]

    def get(self, request, export_id: str):
        ctx = SupportInvestigationContext.from_request(request)
        return SupportResponseBuilder.not_implemented(
            f"Export {export_id} not yet implemented",
            request=request,
            ctx=ctx,
        )

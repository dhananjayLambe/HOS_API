"""Shared API view mixins."""

from __future__ import annotations

from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from support_trace.api.context import SupportInvestigationContext
from support_trace.api.exception_handler import handle_investigation_exception, invalid_identifier, validation_error
from support_trace.api.investigation_request import InvestigationRequestParser
from support_trace.api.permissions import SupportInvestigationPermission
from support_trace.api.response_builder import SupportResponseBuilder
from support_trace.api.throttling import SupportLookupThrottle, SupportSearchThrottle, SupportTimelineThrottle


class SupportAPIView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, SupportInvestigationPermission]

    def get_context(self, request) -> SupportInvestigationContext:
        return SupportInvestigationContext.from_request(request)

    def parse_lookup_request(self, request):
        return InvestigationRequestParser.from_lookup(request)


class SupportSearchView(SupportAPIView):
    throttle_classes = [SupportSearchThrottle]


class SupportLookupView(SupportAPIView):
    throttle_classes = [SupportLookupThrottle]


class SupportTimelineView(SupportAPIView):
    throttle_classes = [SupportTimelineThrottle]

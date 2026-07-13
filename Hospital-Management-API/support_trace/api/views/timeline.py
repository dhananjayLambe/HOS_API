"""Timeline API views."""

from __future__ import annotations

from support_trace.api.exception_handler import handle_investigation_exception
from support_trace.api.facade import SupportInvestigationFacade
from support_trace.api.response_builder import SupportResponseBuilder
from support_trace.api.views.base import SupportTimelineView


class WorkflowTimelineView(SupportTimelineView):
    def get(self, request, workflow_id: str):
        ctx = self.get_context(request)
        req = self.parse_lookup_request(request)
        try:
            result = SupportInvestigationFacade.timeline_workflow(workflow_id, req, ctx)
            return SupportResponseBuilder.timeline_success(result, request=request, ctx=ctx)
        except Exception as exc:
            return handle_investigation_exception(exc, request=request, ctx=ctx)


class PatientTimelineView(SupportTimelineView):
    def get(self, request, patient_id: str):
        ctx = self.get_context(request)
        req = self.parse_lookup_request(request)
        try:
            result = SupportInvestigationFacade.timeline_patient(patient_id, req, ctx)
            return SupportResponseBuilder.timeline_success(result, request=request, ctx=ctx)
        except Exception as exc:
            return handle_investigation_exception(exc, request=request, ctx=ctx)


class CorrelationTimelineView(SupportTimelineView):
    def get(self, request, correlation_id: str):
        ctx = self.get_context(request)
        req = self.parse_lookup_request(request)
        try:
            result = SupportInvestigationFacade.timeline_correlation(correlation_id, req, ctx)
            return SupportResponseBuilder.timeline_success(result, request=request, ctx=ctx)
        except Exception as exc:
            return handle_investigation_exception(exc, request=request, ctx=ctx)


class BookingTimelineView(SupportTimelineView):
    def get(self, request, booking_id: str):
        ctx = self.get_context(request)
        req = self.parse_lookup_request(request)
        try:
            result = SupportInvestigationFacade.timeline_booking(booking_id, req, ctx)
            return SupportResponseBuilder.timeline_success(result, request=request, ctx=ctx)
        except Exception as exc:
            return handle_investigation_exception(exc, request=request, ctx=ctx)

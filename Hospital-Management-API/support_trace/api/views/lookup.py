"""Investigation lookup API views."""

from __future__ import annotations

from support_trace.api.exception_handler import handle_investigation_exception
from support_trace.api.facade import SupportInvestigationFacade
from support_trace.api.response_builder import SupportResponseBuilder
from support_trace.api.views.base import SupportLookupView


class WorkflowLookupView(SupportLookupView):
    def get(self, request, workflow_id: str):
        ctx = self.get_context(request)
        req = self.parse_lookup_request(request)
        try:
            result = SupportInvestigationFacade.lookup_by_workflow(workflow_id, req, ctx)
            return SupportResponseBuilder.lookup_success(result, request=request, ctx=ctx, inv_req=req)
        except Exception as exc:
            return handle_investigation_exception(exc, request=request, ctx=ctx)


class CorrelationLookupView(SupportLookupView):
    def get(self, request, correlation_id: str):
        ctx = self.get_context(request)
        req = self.parse_lookup_request(request)
        try:
            result = SupportInvestigationFacade.lookup_by_correlation(correlation_id, req, ctx)
            return SupportResponseBuilder.lookup_success(result, request=request, ctx=ctx, inv_req=req)
        except Exception as exc:
            return handle_investigation_exception(exc, request=request, ctx=ctx)


class BookingLookupView(SupportLookupView):
    def get(self, request, booking_id: str):
        ctx = self.get_context(request)
        req = self.parse_lookup_request(request)
        try:
            result = SupportInvestigationFacade.lookup_by_booking(booking_id, req, ctx)
            return SupportResponseBuilder.lookup_success(result, request=request, ctx=ctx, inv_req=req)
        except Exception as exc:
            return handle_investigation_exception(exc, request=request, ctx=ctx)


class ReportLookupView(SupportLookupView):
    def get(self, request, report_id: str):
        ctx = self.get_context(request)
        req = self.parse_lookup_request(request)
        try:
            result = SupportInvestigationFacade.lookup_by_report(report_id, req, ctx)
            return SupportResponseBuilder.lookup_success(result, request=request, ctx=ctx, inv_req=req)
        except Exception as exc:
            return handle_investigation_exception(exc, request=request, ctx=ctx)


class RecommendationLookupView(SupportLookupView):
    def get(self, request, recommendation_id: str):
        ctx = self.get_context(request)
        req = self.parse_lookup_request(request)
        try:
            result = SupportInvestigationFacade.lookup_by_recommendation(recommendation_id, req, ctx)
            return SupportResponseBuilder.lookup_success(result, request=request, ctx=ctx, inv_req=req)
        except Exception as exc:
            return handle_investigation_exception(exc, request=request, ctx=ctx)


class ConsultationLookupView(SupportLookupView):
    def get(self, request, consultation_id: str):
        ctx = self.get_context(request)
        req = self.parse_lookup_request(request)
        try:
            result = SupportInvestigationFacade.lookup_by_consultation(consultation_id, req, ctx)
            return SupportResponseBuilder.lookup_success(result, request=request, ctx=ctx, inv_req=req)
        except Exception as exc:
            return handle_investigation_exception(exc, request=request, ctx=ctx)


class PrescriptionLookupView(SupportLookupView):
    def get(self, request, prescription_id: str):
        ctx = self.get_context(request)
        req = self.parse_lookup_request(request)
        try:
            result = SupportInvestigationFacade.lookup_by_prescription(prescription_id, req, ctx)
            return SupportResponseBuilder.lookup_success(result, request=request, ctx=ctx, inv_req=req)
        except Exception as exc:
            return handle_investigation_exception(exc, request=request, ctx=ctx)


class PaymentLookupView(SupportLookupView):
    def get(self, request, payment_id: str):
        ctx = self.get_context(request)
        req = self.parse_lookup_request(request)
        try:
            result = SupportInvestigationFacade.lookup_by_payment(payment_id, req, ctx)
            return SupportResponseBuilder.lookup_success(result, request=request, ctx=ctx, inv_req=req)
        except Exception as exc:
            return handle_investigation_exception(exc, request=request, ctx=ctx)


class WhatsappLookupView(SupportLookupView):
    def get(self, request, message_id: str):
        ctx = self.get_context(request)
        req = self.parse_lookup_request(request)
        try:
            result = SupportInvestigationFacade.lookup_by_whatsapp(message_id, req, ctx)
            return SupportResponseBuilder.lookup_success(result, request=request, ctx=ctx, inv_req=req)
        except Exception as exc:
            return handle_investigation_exception(exc, request=request, ctx=ctx)


class PatientLookupView(SupportLookupView):
    def get(self, request, patient_id: str):
        ctx = self.get_context(request)
        req = self.parse_lookup_request(request)
        try:
            result = SupportInvestigationFacade.lookup_by_patient(patient_id, req, ctx)
            return SupportResponseBuilder.lookup_success(result, request=request, ctx=ctx, inv_req=req)
        except Exception as exc:
            return handle_investigation_exception(exc, request=request, ctx=ctx)


class PhoneLookupView(SupportLookupView):
    def get(self, request, phone: str):
        ctx = self.get_context(request)
        req = self.parse_lookup_request(request)
        try:
            result = SupportInvestigationFacade.lookup_by_phone(phone, req, ctx)
            return SupportResponseBuilder.lookup_success(result, request=request, ctx=ctx, inv_req=req)
        except Exception as exc:
            return handle_investigation_exception(exc, request=request, ctx=ctx)

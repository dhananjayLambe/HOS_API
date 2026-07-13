"""Support Investigation Facade — sole entry point for API controllers."""

from __future__ import annotations

from support_trace.api.contracts.investigation import InvestigationRequest
from support_trace.api.context import SupportInvestigationContext
from support_trace.api.investigation_request import InvestigationRequestParser
from support_trace.lookup import TraceLookupService
from support_trace.timeline import TimelineService
from support_trace.timeline.types import TimelineResult


class SupportInvestigationFacade:
    @classmethod
    def _kwargs(cls, req: InvestigationRequest, ctx: SupportInvestigationContext) -> dict:
        policy = ctx.masking_policy
        return InvestigationRequestParser.service_kwargs(req, policy)

    @classmethod
    def search(cls, req: InvestigationRequest, ctx: SupportInvestigationContext):
        if not req.query:
            raise ValueError("Search query is required")
        return TraceLookupService.lookup_any(req.query, **cls._kwargs(req, ctx))

    @classmethod
    def lookup_by_workflow(cls, workflow_id: str, req: InvestigationRequest, ctx: SupportInvestigationContext):
        return TraceLookupService.lookup_by_workflow(workflow_id, **cls._kwargs(req, ctx))

    @classmethod
    def lookup_by_correlation(cls, correlation_id: str, req: InvestigationRequest, ctx: SupportInvestigationContext):
        return TraceLookupService.lookup_by_correlation(correlation_id, **cls._kwargs(req, ctx))

    @classmethod
    def lookup_by_booking(cls, booking_id: str, req: InvestigationRequest, ctx: SupportInvestigationContext):
        return TraceLookupService.lookup_by_booking(booking_id, **cls._kwargs(req, ctx))

    @classmethod
    def lookup_by_report(cls, report_id: str, req: InvestigationRequest, ctx: SupportInvestigationContext):
        return TraceLookupService.lookup_by_report(report_id, **cls._kwargs(req, ctx))

    @classmethod
    def lookup_by_recommendation(cls, recommendation_id: str, req: InvestigationRequest, ctx: SupportInvestigationContext):
        return TraceLookupService.lookup_by_recommendation(recommendation_id, **cls._kwargs(req, ctx))

    @classmethod
    def lookup_by_consultation(cls, consultation_id: str, req: InvestigationRequest, ctx: SupportInvestigationContext):
        return TraceLookupService.lookup_by_consultation(consultation_id, **cls._kwargs(req, ctx))

    @classmethod
    def lookup_by_prescription(cls, prescription_id: str, req: InvestigationRequest, ctx: SupportInvestigationContext):
        return TraceLookupService.lookup_by_prescription(prescription_id, **cls._kwargs(req, ctx))

    @classmethod
    def lookup_by_payment(cls, payment_id: str, req: InvestigationRequest, ctx: SupportInvestigationContext):
        return TraceLookupService.lookup_by_payment(payment_id, **cls._kwargs(req, ctx))

    @classmethod
    def lookup_by_whatsapp(cls, message_id: str, req: InvestigationRequest, ctx: SupportInvestigationContext):
        return TraceLookupService.lookup_by_whatsapp(message_id, **cls._kwargs(req, ctx))

    @classmethod
    def lookup_by_patient(cls, patient_id: str, req: InvestigationRequest, ctx: SupportInvestigationContext):
        return TraceLookupService.lookup_by_patient(patient_id, **cls._kwargs(req, ctx))

    @classmethod
    def lookup_by_phone(cls, phone: str, req: InvestigationRequest, ctx: SupportInvestigationContext):
        return TraceLookupService.lookup_by_phone(phone, **cls._kwargs(req, ctx))

    @classmethod
    def timeline_workflow(cls, workflow_id: str, req: InvestigationRequest, ctx: SupportInvestigationContext) -> TimelineResult:
        return TimelineService.build_workflow_timeline(workflow_id, filters=req.filters)

    @classmethod
    def timeline_patient(cls, patient_id: str, req: InvestigationRequest, ctx: SupportInvestigationContext) -> TimelineResult:
        return TimelineService.build_patient_timeline(patient_id, filters=req.filters)

    @classmethod
    def timeline_correlation(cls, correlation_id: str, req: InvestigationRequest, ctx: SupportInvestigationContext) -> TimelineResult:
        return TimelineService.build_correlation_timeline(correlation_id, filters=req.filters)

    @classmethod
    def timeline_booking(cls, booking_id: str, req: InvestigationRequest, ctx: SupportInvestigationContext) -> TimelineResult:
        return TimelineService.build_booking_timeline(booking_id, filters=req.filters)

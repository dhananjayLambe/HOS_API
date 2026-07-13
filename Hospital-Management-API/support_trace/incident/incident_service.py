"""Public incident reconstruction API — IncidentReconstructionService."""

from __future__ import annotations

from typing import Any

from support_trace.incident.enums import ReconstructionLevel
from support_trace.incident.investigation_context import IncidentContext, ReconstructionPolicy
from support_trace.incident.reconstruction_engine import ReconstructionEngine
from support_trace.incident.types import IncidentReport
from support_trace.lookup import TraceLookupService
from support_trace.timeline.types import TimelineFilter


class IncidentReconstructionService:
    """Canonical production incident reconstruction engine."""

    @classmethod
    def reconstruct_any(
        cls,
        raw: str,
        *,
        level: ReconstructionLevel = ReconstructionLevel.FULL,
        policy: ReconstructionPolicy | None = None,
        filters: TimelineFilter | None = None,
        investigation_id: str | None = None,
    ) -> IncidentReport:
        ctx = IncidentContext.create(f"any:{raw}", level=level, policy=policy, investigation_id=investigation_id)
        return ReconstructionEngine.reconstruct(
            ctx, TraceLookupService.lookup_any, raw, filters=filters
        )

    @classmethod
    def reconstruct_booking(
        cls, booking_id: str, **kwargs: Any
    ) -> IncidentReport:
        return cls._typed("booking", booking_id, TraceLookupService.lookup_by_booking, **kwargs)

    @classmethod
    def reconstruct_report(cls, report_id: str, **kwargs: Any) -> IncidentReport:
        return cls._typed("report", report_id, TraceLookupService.lookup_by_report, **kwargs)

    @classmethod
    def reconstruct_consultation(cls, consultation_id: str, **kwargs: Any) -> IncidentReport:
        return cls._typed("consultation", consultation_id, TraceLookupService.lookup_by_consultation, **kwargs)

    @classmethod
    def reconstruct_recommendation(cls, recommendation_id: str, **kwargs: Any) -> IncidentReport:
        return cls._typed("recommendation", recommendation_id, TraceLookupService.lookup_by_recommendation, **kwargs)

    @classmethod
    def reconstruct_prescription(cls, prescription_id: str, **kwargs: Any) -> IncidentReport:
        return cls._typed("prescription", prescription_id, TraceLookupService.lookup_by_prescription, **kwargs)

    @classmethod
    def reconstruct_whatsapp(cls, message_id: str, **kwargs: Any) -> IncidentReport:
        return cls._typed("whatsapp", message_id, TraceLookupService.lookup_by_whatsapp, **kwargs)

    @classmethod
    def reconstruct_payment(cls, payment_id: str, **kwargs: Any) -> IncidentReport:
        return cls._typed("payment", payment_id, TraceLookupService.lookup_by_payment, **kwargs)

    @classmethod
    def reconstruct_workflow(cls, workflow_id: str, **kwargs: Any) -> IncidentReport:
        return cls._typed("workflow", workflow_id, TraceLookupService.lookup_by_workflow, **kwargs)

    @classmethod
    def reconstruct_correlation(cls, correlation_id: str, **kwargs: Any) -> IncidentReport:
        return cls._typed("correlation", correlation_id, TraceLookupService.lookup_by_correlation, **kwargs)

    @classmethod
    def reconstruct_patient(cls, patient_id: str, **kwargs: Any) -> IncidentReport:
        return cls._typed("patient", patient_id, TraceLookupService.lookup_by_patient, **kwargs)

    @classmethod
    def _typed(
        cls,
        scope_type: str,
        identifier: str,
        lookup_fn: Any,
        *,
        level: ReconstructionLevel = ReconstructionLevel.FULL,
        policy: ReconstructionPolicy | None = None,
        filters: TimelineFilter | None = None,
        investigation_id: str | None = None,
    ) -> IncidentReport:
        ctx = IncidentContext.create(
            f"{scope_type}:{identifier}",
            level=level,
            policy=policy,
            investigation_id=investigation_id,
        )
        return ReconstructionEngine.reconstruct(ctx, lookup_fn, identifier, filters=filters)

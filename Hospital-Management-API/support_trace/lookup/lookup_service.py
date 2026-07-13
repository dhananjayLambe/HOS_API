"""Public investigation API — TraceLookupService."""

from __future__ import annotations

import time
from typing import Any

from support_trace.identifiers.types import IdentifierLookupResult
from support_trace.lookup.enums import InvestigationLevel
from support_trace.lookup.hooks import fail_open_investigation
from support_trace.lookup.identifier_lookup import IdentifierLookupDelegate
from support_trace.lookup.investigation_engine import InvestigationEngine
from support_trace.lookup.investigation_policy import InvestigationOptions, InvestigationPolicy
from support_trace.lookup.types import TraceLookupResult
from support_trace.lookup.workflow_lookup import WorkflowLookupDelegate
from support_trace.timeline.types import TimelineFilter


class TraceLookupService:
    """Canonical production investigation engine."""

    @classmethod
    def investigate(
        cls,
        raw: str,
        *,
        level: InvestigationLevel = InvestigationLevel.FULL,
        options: InvestigationOptions | None = None,
        policy: InvestigationPolicy | None = None,
        filters: TimelineFilter | None = None,
    ) -> TraceLookupResult:
        return cls.lookup_any(
            raw,
            level=level,
            options=options,
            policy=policy,
            filters=filters,
        )

    @classmethod
    def lookup_any(
        cls,
        raw: str,
        *,
        level: InvestigationLevel = InvestigationLevel.FULL,
        options: InvestigationOptions | None = None,
        policy: InvestigationPolicy | None = None,
        filters: TimelineFilter | None = None,
    ) -> TraceLookupResult:
        lookup = IdentifierLookupDelegate.lookup_any(raw)
        return cls._run_investigation(
            lookup,
            level=level,
            options=options,
            policy=policy,
            filters=filters,
        )

    @classmethod
    def lookup_by_patient(
        cls,
        patient_id: str,
        *,
        level: InvestigationLevel = InvestigationLevel.FULL,
        options: InvestigationOptions | None = None,
        policy: InvestigationPolicy | None = None,
        filters: TimelineFilter | None = None,
    ) -> TraceLookupResult:
        lookup = IdentifierLookupDelegate.lookup_patient(patient_id)
        return cls._run_investigation(
            lookup, level=level, options=options, policy=policy or InvestigationPolicy.for_patient_investigation(), filters=filters
        )

    @classmethod
    def lookup_by_patient_account(
        cls, account_id: str, **kwargs: Any
    ) -> TraceLookupResult:
        lookup = IdentifierLookupDelegate.lookup_patient_account(account_id)
        return cls._run_investigation(lookup, **cls._kwargs(kwargs))

    @classmethod
    def lookup_by_consultation(cls, consultation_id: str, **kwargs: Any) -> TraceLookupResult:
        lookup = IdentifierLookupDelegate.lookup_consultation(consultation_id)
        return cls._run_investigation(lookup, **cls._kwargs(kwargs))

    @classmethod
    def lookup_by_encounter(cls, encounter_id: str, **kwargs: Any) -> TraceLookupResult:
        lookup = IdentifierLookupDelegate.lookup_encounter(encounter_id)
        return cls._run_investigation(lookup, **cls._kwargs(kwargs))

    @classmethod
    def lookup_by_booking(cls, booking_id: str, **kwargs: Any) -> TraceLookupResult:
        lookup = IdentifierLookupDelegate.lookup_booking(booking_id)
        return cls._run_investigation(lookup, **cls._kwargs(kwargs))

    @classmethod
    def lookup_by_recommendation(cls, recommendation_id: str, **kwargs: Any) -> TraceLookupResult:
        lookup = IdentifierLookupDelegate.lookup_recommendation(recommendation_id)
        return cls._run_investigation(lookup, **cls._kwargs(kwargs))

    @classmethod
    def lookup_by_routing(cls, routing_id: str, **kwargs: Any) -> TraceLookupResult:
        lookup = IdentifierLookupDelegate.lookup_routing(routing_id)
        return cls._run_investigation(lookup, **cls._kwargs(kwargs))

    @classmethod
    def lookup_by_report(cls, report_id: str, **kwargs: Any) -> TraceLookupResult:
        lookup = IdentifierLookupDelegate.lookup_report(report_id)
        return cls._run_investigation(lookup, **cls._kwargs(kwargs))

    @classmethod
    def lookup_by_prescription(cls, prescription_id: str, **kwargs: Any) -> TraceLookupResult:
        lookup = IdentifierLookupDelegate.lookup_prescription(prescription_id)
        return cls._run_investigation(lookup, **cls._kwargs(kwargs))

    @classmethod
    def lookup_by_payment(cls, payment_id: str, **kwargs: Any) -> TraceLookupResult:
        lookup = IdentifierLookupDelegate.lookup_payment(payment_id)
        return cls._run_investigation(lookup, **cls._kwargs(kwargs))

    @classmethod
    def lookup_by_invoice(cls, invoice_id: str, **kwargs: Any) -> TraceLookupResult:
        lookup = IdentifierLookupDelegate.lookup_invoice(invoice_id)
        return cls._run_investigation(lookup, **cls._kwargs(kwargs))

    @classmethod
    def lookup_by_whatsapp(cls, message_id: str, **kwargs: Any) -> TraceLookupResult:
        lookup = IdentifierLookupDelegate.lookup_whatsapp(message_id)
        return cls._run_investigation(lookup, **cls._kwargs(kwargs))

    @classmethod
    def lookup_by_phone(cls, phone: str, **kwargs: Any) -> TraceLookupResult:
        lookup = IdentifierLookupDelegate.lookup_phone(phone)
        return cls._run_investigation(lookup, **cls._kwargs(kwargs))

    @classmethod
    def lookup_by_provider_reference(cls, ref: str, **kwargs: Any) -> TraceLookupResult:
        lookup = IdentifierLookupDelegate.lookup_provider_reference(ref)
        return cls._run_investigation(lookup, **cls._kwargs(kwargs))

    @classmethod
    def lookup_by_workflow(cls, workflow_instance_id: str, **kwargs: Any) -> TraceLookupResult:
        lookup, scope = WorkflowLookupDelegate.lookup_by_workflow(workflow_instance_id)
        return cls._run_investigation(lookup, scope=scope, **cls._kwargs(kwargs))

    @classmethod
    def lookup_by_correlation(cls, correlation_id: str, **kwargs: Any) -> TraceLookupResult:
        lookup, scope = WorkflowLookupDelegate.lookup_by_correlation(correlation_id)
        return cls._run_investigation(lookup, scope=scope, **cls._kwargs(kwargs))

    @classmethod
    def lookup_many(
        cls,
        ids: list[str],
        *,
        parallel: bool = True,
        level: InvestigationLevel = InvestigationLevel.FULL,
        options: InvestigationOptions | None = None,
        policy: InvestigationPolicy | None = None,
    ) -> list[TraceLookupResult]:
        # parallel=True reserved for future async; sequential for M5.5
        _ = parallel
        started = time.perf_counter()
        results: list[TraceLookupResult] = []
        seen: set[str] = set()
        for raw in ids:
            result = cls.lookup_any(
                raw, level=level, options=options, policy=policy
            )
            dedupe_key = result.scope or (
                str(getattr(result.primary_trace, "workflow_instance_id", ""))
                if result.primary_trace
                else raw
            )
            if dedupe_key in seen:
                continue
            seen.add(dedupe_key)
            results.append(result)
        return results

    @classmethod
    def _run_investigation(
        cls,
        lookup: IdentifierLookupResult,
        *,
        scope=None,
        level: InvestigationLevel = InvestigationLevel.FULL,
        options: InvestigationOptions | None = None,
        policy: InvestigationPolicy | None = None,
        filters: TimelineFilter | None = None,
    ) -> TraceLookupResult:
        return fail_open_investigation(
            "run_investigation",
            lambda: cls._run_investigation_impl(
                lookup,
                scope=scope,
                level=level,
                options=options,
                policy=policy,
                filters=filters,
            ),
            default=TraceLookupResult(level=level, identifier_lookup=lookup),
        )

    @classmethod
    def _run_investigation_impl(
        cls,
        lookup: IdentifierLookupResult,
        *,
        scope=None,
        level: InvestigationLevel = InvestigationLevel.FULL,
        options: InvestigationOptions | None = None,
        policy: InvestigationPolicy | None = None,
        filters: TimelineFilter | None = None,
    ) -> TraceLookupResult:
        context = InvestigationEngine.build_context_from_lookup(
            lookup,
            level=level,
            options=options,
            policy=policy or InvestigationPolicy.default(),
            filters=filters,
        )
        if scope is not None:
            context.timeline_scope = scope
        return InvestigationEngine.investigate(context)

    @staticmethod
    def _kwargs(kwargs: dict[str, Any]) -> dict[str, Any]:
        return {
            "level": kwargs.get("level", InvestigationLevel.FULL),
            "options": kwargs.get("options"),
            "policy": kwargs.get("policy"),
            "filters": kwargs.get("filters"),
        }

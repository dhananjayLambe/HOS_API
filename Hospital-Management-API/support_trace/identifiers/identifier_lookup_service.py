"""Public identifier lookup API for production support."""

from __future__ import annotations

import time

from support_trace.identifiers.hooks import fail_open_identifier
from support_trace.identifiers.identifier_detector import IdentifierDetector
from support_trace.identifiers.identifier_registry import IdentifierRegistry
from support_trace.identifiers.lookup_result_builder import LookupResultBuilder
from support_trace.identifiers.normalization_registry import NormalizationRegistry
from support_trace.identifiers.relationship_resolver import RelationshipResolver
from support_trace.identifiers.search_planner import SearchPlanner
from support_trace.identifiers.search_repository import SupportTraceSearchRepository
from support_trace.identifiers.types import DetectedIdentifier, IdentifierLookupResult, IdentifierType


class IdentifierLookupService:
    """Universal identifier resolution — paste any ID, get SupportTrace matches."""

    @classmethod
    def lookup_any(
        cls,
        raw: str,
        *,
        expand_relationships: bool = True,
        exact_only: bool = False,
    ) -> IdentifierLookupResult:
        return fail_open_identifier(
            "lookup_any",
            lambda: cls._lookup_any_impl(
                raw,
                expand_relationships=expand_relationships,
                exact_only=exact_only,
            ),
            default=IdentifierLookupResult(
                identifier=raw,
                normalized=str(raw).strip(),
                detected_type=None,
                matched_field=None,
                matched_value=None,
                confidence=0.0,
                strategy=None,
            ),
        )

    @classmethod
    def _lookup_any_impl(
        cls,
        raw: str,
        *,
        expand_relationships: bool,
        exact_only: bool,
    ) -> IdentifierLookupResult:
        started = time.perf_counter()
        candidates = IdentifierDetector.detect(raw)
        detected = candidates[0] if candidates else None
        search_result = cls._search_detected(
            detected,
            raw=raw,
            expand_relationships=expand_relationships,
            exact_only=exact_only,
        )
        related: list = []
        if expand_relationships and search_result.traces:
            related = RelationshipResolver.expand(search_result.traces)
        elapsed_ms = (time.perf_counter() - started) * 1000
        return LookupResultBuilder.build(
            raw=raw,
            detected=detected,
            search_result=search_result,
            related_traces=related,
            search_time_ms=elapsed_ms,
        )

    @classmethod
    def _search_detected(
        cls,
        detected: DetectedIdentifier | None,
        *,
        raw: str,
        expand_relationships: bool,
        exact_only: bool,
    ):
        from support_trace.identifiers.types import SearchResult

        if detected is not None:
            plan = SearchPlanner.plan(
                detected,
                expand_relationships=expand_relationships,
                exact_only=exact_only,
            )
            return SupportTraceSearchRepository.execute(plan)

        normalized = str(raw).strip()
        for field in ("provider_reference", "phone_number"):
            result = SupportTraceSearchRepository.exact_match(field, normalized)
            if result:
                return cls._as_result(result, field, normalized, "exact")
        return SearchResult()

    @staticmethod
    def _as_result(traces, field, value, strategy):
        from support_trace.identifiers.types import SearchResult

        return SearchResult(
            traces=traces,
            matched_field=field,
            matched_value=value,
            strategy=strategy,
        )

    @classmethod
    def lookup_patient(cls, account_or_profile_id: str) -> IdentifierLookupResult:
        normalized = NormalizationRegistry.normalize("patient_account_id", account_or_profile_id)
        if normalized:
            result = cls.lookup_any(normalized, exact_only=True)
            if result.traces:
                return result
        return cls._typed_lookup("patient_profile_id", account_or_profile_id, IdentifierType.PATIENT_PROFILE)

    @classmethod
    def lookup_consultation(cls, consultation_id: str) -> IdentifierLookupResult:
        return cls._typed_lookup("consultation_id", consultation_id, IdentifierType.CONSULTATION)

    @classmethod
    def lookup_booking(cls, booking_id: str) -> IdentifierLookupResult:
        return cls._typed_lookup("booking_id", booking_id, IdentifierType.BOOKING)

    @classmethod
    def lookup_report(cls, report_id: str) -> IdentifierLookupResult:
        return cls._typed_lookup("report_id", report_id, IdentifierType.REPORT)

    @classmethod
    def lookup_whatsapp(cls, message_id: str) -> IdentifierLookupResult:
        return cls._typed_lookup(
            "whatsapp_message_id", message_id, IdentifierType.WHATSAPP_MESSAGE
        )

    @classmethod
    def lookup_payment(cls, payment_id: str) -> IdentifierLookupResult:
        return cls._typed_lookup("payment_id", payment_id, IdentifierType.PAYMENT)

    @classmethod
    def lookup_provider_reference(cls, ref: str) -> IdentifierLookupResult:
        return cls._typed_lookup(
            "provider_reference", ref, IdentifierType.PROVIDER_REFERENCE
        )

    @classmethod
    def lookup_phone(cls, phone: str) -> IdentifierLookupResult:
        return cls._typed_lookup("phone_number", phone, IdentifierType.PHONE)

    @classmethod
    def lookup_encounter(cls, encounter_id: str) -> IdentifierLookupResult:
        return cls._typed_lookup("encounter_id", encounter_id, IdentifierType.ENCOUNTER)

    @classmethod
    def lookup_recommendation(cls, recommendation_id: str) -> IdentifierLookupResult:
        return cls._typed_lookup(
            "recommendation_id", recommendation_id, IdentifierType.RECOMMENDATION
        )

    @classmethod
    def lookup_routing(cls, routing_id: str) -> IdentifierLookupResult:
        return cls._typed_lookup("routing_id", routing_id, IdentifierType.ROUTING)

    @classmethod
    def lookup_prescription(cls, prescription_id: str) -> IdentifierLookupResult:
        return cls._typed_lookup(
            "prescription_id", prescription_id, IdentifierType.PRESCRIPTION
        )

    @classmethod
    def lookup_invoice(cls, invoice_id: str) -> IdentifierLookupResult:
        return cls._typed_lookup("invoice_id", invoice_id, IdentifierType.INVOICE)

    @classmethod
    def _typed_lookup(
        cls,
        field_name: str,
        value: str,
        identifier_type: IdentifierType,
    ) -> IdentifierLookupResult:
        started = time.perf_counter()
        strategy = IdentifierRegistry.get_by_field(field_name)
        normalized = strategy.normalize(value) if strategy else str(value).strip()
        if not normalized:
            return IdentifierLookupResult(
                identifier=value,
                normalized="",
                detected_type=identifier_type,
                matched_field=None,
                matched_value=None,
                confidence=1.0,
                strategy=None,
            )
        plan = SearchPlanner.plan_for_field(
            field_name,
            normalized,
            identifier_type=identifier_type,
        )
        search_result = SupportTraceSearchRepository.execute(plan)
        related = RelationshipResolver.expand(search_result.traces)
        detected = DetectedIdentifier(
            identifier_type=identifier_type,
            confidence=1.0,
            reason="typed lookup",
            normalized=normalized,
            field_name=field_name,
        )
        elapsed_ms = (time.perf_counter() - started) * 1000
        return LookupResultBuilder.build(
            raw=value,
            detected=detected,
            search_result=search_result,
            related_traces=related,
            search_time_ms=elapsed_ms,
        )

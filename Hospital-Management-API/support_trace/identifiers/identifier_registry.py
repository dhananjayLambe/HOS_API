"""Facade registry composing all identifier strategies."""

from __future__ import annotations

from typing import Any

from support_trace.identifiers.strategies import (
    BookingIdentifierStrategy,
    BranchIdentifierStrategy,
    ConsultationIdentifierStrategy,
    EncounterIdentifierStrategy,
    InvoiceIdentifierStrategy,
    LaboratoryIdentifierStrategy,
    OrderIdentifierStrategy,
    PatientAccountIdentifierStrategy,
    PatientProfileIdentifierStrategy,
    PaymentIdentifierStrategy,
    PhoneIdentifierStrategy,
    PrescriptionIdentifierStrategy,
    ProviderReferenceIdentifierStrategy,
    RecommendationIdentifierStrategy,
    ReportIdentifierStrategy,
    RoutingIdentifierStrategy,
    WhatsAppIdentifierStrategy,
)
from support_trace.identifiers.types import IdentifierStrategy

IDENTIFIER_REGISTRY: list[IdentifierStrategy] = [
    WhatsAppIdentifierStrategy(),
    PaymentIdentifierStrategy(),
    PhoneIdentifierStrategy(),
    BookingIdentifierStrategy(),
    ConsultationIdentifierStrategy(),
    ReportIdentifierStrategy(),
    RecommendationIdentifierStrategy(),
    OrderIdentifierStrategy(),
    RoutingIdentifierStrategy(),
    PrescriptionIdentifierStrategy(),
    PatientAccountIdentifierStrategy(),
    PatientProfileIdentifierStrategy(),
    EncounterIdentifierStrategy(),
    InvoiceIdentifierStrategy(),
    LaboratoryIdentifierStrategy(),
    BranchIdentifierStrategy(),
    ProviderReferenceIdentifierStrategy(),
]


class IdentifierRegistry:
    """Single entry point for strategy lookup."""

    _strategies = IDENTIFIER_REGISTRY
    _by_field: dict[str, IdentifierStrategy] = {
        s.field_name: s for s in _strategies
    }

    @classmethod
    def all_strategies(cls) -> list[IdentifierStrategy]:
        return list(cls._strategies)

    @classmethod
    def get_by_field(cls, field_name: str) -> IdentifierStrategy | None:
        return cls._by_field.get(field_name)

    @classmethod
    def extract_from_audit(cls, audit: Any, *, source: str) -> dict[str, str]:
        from support_trace.identifiers.extraction_registry import ExtractionRegistry

        return ExtractionRegistry.extract(audit, source=source)

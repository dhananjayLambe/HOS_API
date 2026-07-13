"""Thin delegate to M5.3 IdentifierLookupService."""

from __future__ import annotations

from support_trace.identifiers.identifier_lookup_service import IdentifierLookupService
from support_trace.identifiers.types import IdentifierLookupResult


class IdentifierLookupDelegate:
    @staticmethod
    def lookup_any(raw: str, *, expand_relationships: bool = True) -> IdentifierLookupResult:
        return IdentifierLookupService.lookup_any(
            raw, expand_relationships=expand_relationships
        )

    @staticmethod
    def lookup_patient(account_or_profile_id: str) -> IdentifierLookupResult:
        return IdentifierLookupService.lookup_patient(account_or_profile_id)

    @staticmethod
    def lookup_patient_account(account_id: str) -> IdentifierLookupResult:
        return IdentifierLookupService.lookup_any(account_id, exact_only=True)

    @staticmethod
    def lookup_consultation(consultation_id: str) -> IdentifierLookupResult:
        return IdentifierLookupService.lookup_consultation(consultation_id)

    @staticmethod
    def lookup_encounter(encounter_id: str) -> IdentifierLookupResult:
        return IdentifierLookupService.lookup_encounter(encounter_id)

    @staticmethod
    def lookup_booking(booking_id: str) -> IdentifierLookupResult:
        return IdentifierLookupService.lookup_booking(booking_id)

    @staticmethod
    def lookup_recommendation(recommendation_id: str) -> IdentifierLookupResult:
        return IdentifierLookupService.lookup_recommendation(recommendation_id)

    @staticmethod
    def lookup_routing(routing_id: str) -> IdentifierLookupResult:
        return IdentifierLookupService.lookup_routing(routing_id)

    @staticmethod
    def lookup_report(report_id: str) -> IdentifierLookupResult:
        return IdentifierLookupService.lookup_report(report_id)

    @staticmethod
    def lookup_prescription(prescription_id: str) -> IdentifierLookupResult:
        return IdentifierLookupService.lookup_prescription(prescription_id)

    @staticmethod
    def lookup_payment(payment_id: str) -> IdentifierLookupResult:
        return IdentifierLookupService.lookup_payment(payment_id)

    @staticmethod
    def lookup_invoice(invoice_id: str) -> IdentifierLookupResult:
        return IdentifierLookupService.lookup_invoice(invoice_id)

    @staticmethod
    def lookup_whatsapp(message_id: str) -> IdentifierLookupResult:
        return IdentifierLookupService.lookup_whatsapp(message_id)

    @staticmethod
    def lookup_phone(phone: str) -> IdentifierLookupResult:
        return IdentifierLookupService.lookup_phone(phone)

    @staticmethod
    def lookup_provider_reference(ref: str) -> IdentifierLookupResult:
        return IdentifierLookupService.lookup_provider_reference(ref)

"""Per-identifier strategy implementations."""

from __future__ import annotations

from typing import Any

from business_audit.enums import BusinessResourceType, WorkflowType

from support_trace.identifiers.constants import (
    PAYMENT_PREFIX,
    PHONE_MAX_DIGITS,
    PHONE_MIN_DIGITS,
    RAZORPAY_PREFIX,
    UUID_PROBE_PRIORITY,
    WHATSAPP_PREFIX,
)
from support_trace.identifiers.strategies.base import BaseIdentifierStrategy, _digits_only
from support_trace.identifiers.types import DetectedIdentifier, IdentifierType


class PhoneIdentifierStrategy(BaseIdentifierStrategy):
    identifier_type = IdentifierType.PHONE
    field_name = "phone_number"
    partial_search = True

    def _detect_impl(self, text: str) -> DetectedIdentifier | None:
        digits = _digits_only(text)
        if PHONE_MIN_DIGITS <= len(digits) <= PHONE_MAX_DIGITS:
            return DetectedIdentifier(
                identifier_type=self.identifier_type,
                confidence=0.75 if len(digits) == 12 else 0.65,
                reason=f"{len(digits)} digit phone",
                normalized=digits,
                field_name=self.field_name,
            )
        return None


class PatientAccountIdentifierStrategy(BaseIdentifierStrategy):
    identifier_type = IdentifierType.PATIENT_ACCOUNT
    field_name = "patient_account_id"
    uuid_field = True

    def __init__(self) -> None:
        if self.field_name in UUID_PROBE_PRIORITY:
            self.uuid_probe_rank = UUID_PROBE_PRIORITY.index(self.field_name)
        else:
            self.uuid_probe_rank = len(UUID_PROBE_PRIORITY)

    def _detect_impl(self, text: str) -> DetectedIdentifier | None:
        return self._detect_uuid(text, base_confidence=0.55, reason="valid UUID")


class PatientProfileIdentifierStrategy(BaseIdentifierStrategy):
    identifier_type = IdentifierType.PATIENT_PROFILE
    field_name = "patient_profile_id"
    uuid_field = True

    def __init__(self) -> None:
        if self.field_name in UUID_PROBE_PRIORITY:
            self.uuid_probe_rank = UUID_PROBE_PRIORITY.index(self.field_name)
        else:
            self.uuid_probe_rank = len(UUID_PROBE_PRIORITY)

    def _detect_impl(self, text: str) -> DetectedIdentifier | None:
        return self._detect_uuid(text, base_confidence=0.54, reason="valid UUID")


class ConsultationIdentifierStrategy(BaseIdentifierStrategy):
    identifier_type = IdentifierType.CONSULTATION
    field_name = "consultation_id"
    uuid_field = True

    def __init__(self) -> None:
        if self.field_name in UUID_PROBE_PRIORITY:
            self.uuid_probe_rank = UUID_PROBE_PRIORITY.index(self.field_name)
        else:
            self.uuid_probe_rank = len(UUID_PROBE_PRIORITY)

    def _detect_impl(self, text: str) -> DetectedIdentifier | None:
        return self._detect_uuid(text, base_confidence=0.72, reason="valid UUID")

    def extract_from_clinical_audit(self, audit: Any) -> str | None:
        value = self._extract_from_clinical(audit)
        if value:
            return value
        if str(getattr(audit, "resource_type", "") or "") == "consultation":
            return self.normalize(str(getattr(audit, "resource_id", "") or ""))
        return None


class EncounterIdentifierStrategy(BaseIdentifierStrategy):
    identifier_type = IdentifierType.ENCOUNTER
    field_name = "encounter_id"
    uuid_field = True

    def __init__(self) -> None:
        if self.field_name in UUID_PROBE_PRIORITY:
            self.uuid_probe_rank = UUID_PROBE_PRIORITY.index(self.field_name)
        else:
            self.uuid_probe_rank = len(UUID_PROBE_PRIORITY)

    def _detect_impl(self, text: str) -> DetectedIdentifier | None:
        return self._detect_uuid(text, base_confidence=0.53, reason="valid UUID")


class PrescriptionIdentifierStrategy(BaseIdentifierStrategy):
    identifier_type = IdentifierType.PRESCRIPTION
    field_name = "prescription_id"
    uuid_field = True

    def __init__(self) -> None:
        if self.field_name in UUID_PROBE_PRIORITY:
            self.uuid_probe_rank = UUID_PROBE_PRIORITY.index(self.field_name)
        else:
            self.uuid_probe_rank = len(UUID_PROBE_PRIORITY)

    def _detect_impl(self, text: str) -> DetectedIdentifier | None:
        return self._detect_uuid(text, base_confidence=0.58, reason="valid UUID")

    def extract_from_clinical_audit(self, audit: Any) -> str | None:
        if str(getattr(audit, "resource_type", "") or "") == "prescription":
            return self.normalize(str(getattr(audit, "resource_id", "") or ""))
        return self._extract_from_clinical(audit)


class RecommendationIdentifierStrategy(BaseIdentifierStrategy):
    identifier_type = IdentifierType.RECOMMENDATION
    field_name = "recommendation_id"
    uuid_field = True

    def __init__(self) -> None:
        if self.field_name in UUID_PROBE_PRIORITY:
            self.uuid_probe_rank = UUID_PROBE_PRIORITY.index(self.field_name)
        else:
            self.uuid_probe_rank = len(UUID_PROBE_PRIORITY)

    def _detect_impl(self, text: str) -> DetectedIdentifier | None:
        return self._detect_uuid(text, base_confidence=0.68, reason="valid UUID")

    def extract_from_business_audit(self, audit: Any) -> str | None:
        value = self._extract_from_payload(audit)
        if value:
            return value
        if (
            str(audit.resource_type) == BusinessResourceType.RECOMMENDATION
            or str(audit.workflow_type) == WorkflowType.RECOMMENDATION
        ):
            return self.normalize(str(audit.resource_id))
        return None


class BookingIdentifierStrategy(BaseIdentifierStrategy):
    identifier_type = IdentifierType.BOOKING
    field_name = "booking_id"
    uuid_field = True

    def __init__(self) -> None:
        if self.field_name in UUID_PROBE_PRIORITY:
            self.uuid_probe_rank = UUID_PROBE_PRIORITY.index(self.field_name)
        else:
            self.uuid_probe_rank = len(UUID_PROBE_PRIORITY)

    def _detect_impl(self, text: str) -> DetectedIdentifier | None:
        return self._detect_uuid(text, base_confidence=0.75, reason="valid UUID")

    def extract_from_business_audit(self, audit: Any) -> str | None:
        value = self._extract_from_payload(audit)
        if value:
            return value
        if (
            str(audit.resource_type) == BusinessResourceType.BOOKING
            or str(audit.workflow_type) == WorkflowType.BOOKING
        ):
            return self.normalize(str(audit.resource_id))
        return None


class RoutingIdentifierStrategy(BaseIdentifierStrategy):
    identifier_type = IdentifierType.ROUTING
    field_name = "routing_id"
    uuid_field = True

    def __init__(self) -> None:
        if self.field_name in UUID_PROBE_PRIORITY:
            self.uuid_probe_rank = UUID_PROBE_PRIORITY.index(self.field_name)
        else:
            self.uuid_probe_rank = len(UUID_PROBE_PRIORITY)

    def _detect_impl(self, text: str) -> DetectedIdentifier | None:
        return self._detect_uuid(text, base_confidence=0.62, reason="valid UUID")

    def extract_from_business_audit(self, audit: Any) -> str | None:
        value = self._extract_from_payload(audit)
        if value:
            return value
        if (
            str(audit.resource_type) == BusinessResourceType.DECISION
            or str(audit.workflow_type) == WorkflowType.ROUTING
        ):
            return self.normalize(str(audit.resource_id))
        return None


class ReportIdentifierStrategy(BaseIdentifierStrategy):
    identifier_type = IdentifierType.REPORT
    field_name = "report_id"
    uuid_field = True

    def __init__(self) -> None:
        if self.field_name in UUID_PROBE_PRIORITY:
            self.uuid_probe_rank = UUID_PROBE_PRIORITY.index(self.field_name)
        else:
            self.uuid_probe_rank = len(UUID_PROBE_PRIORITY)

    def _detect_impl(self, text: str) -> DetectedIdentifier | None:
        return self._detect_uuid(text, base_confidence=0.70, reason="valid UUID")

    def extract_from_business_audit(self, audit: Any) -> str | None:
        value = self._extract_from_payload(audit)
        if value:
            return value
        if str(audit.resource_type) == BusinessResourceType.REPORT or str(
            audit.workflow_type
        ) in (WorkflowType.REPORT_DELIVERY, WorkflowType.DIAGNOSTIC_REPORT):
            return self.normalize(str(audit.resource_id))
        return None

    def extract_from_clinical_audit(self, audit: Any) -> str | None:
        if str(getattr(audit, "resource_type", "") or "") == "report":
            return self.normalize(str(getattr(audit, "resource_id", "") or ""))
        return self._extract_from_clinical(audit)


class OrderIdentifierStrategy(BaseIdentifierStrategy):
    identifier_type = IdentifierType.ORDER
    field_name = "order_id"
    uuid_field = True

    def __init__(self) -> None:
        if self.field_name in UUID_PROBE_PRIORITY:
            self.uuid_probe_rank = UUID_PROBE_PRIORITY.index(self.field_name)
        else:
            self.uuid_probe_rank = len(UUID_PROBE_PRIORITY)

    def _detect_impl(self, text: str) -> DetectedIdentifier | None:
        return self._detect_uuid(text, base_confidence=0.66, reason="valid UUID")

    def extract_from_business_audit(self, audit: Any) -> str | None:
        value = self._extract_from_payload(audit)
        if value:
            return value
        if str(audit.resource_type) == BusinessResourceType.ORDER:
            return self.normalize(str(audit.resource_id))
        return None


class PaymentIdentifierStrategy(BaseIdentifierStrategy):
    identifier_type = IdentifierType.PAYMENT
    field_name = "payment_id"
    partial_search = True

    def _detect_impl(self, text: str) -> DetectedIdentifier | None:
        normalized = self.normalize(text)
        if not normalized:
            return None
        if normalized.startswith(PAYMENT_PREFIX) or normalized.startswith(RAZORPAY_PREFIX):
            return DetectedIdentifier(
                identifier_type=self.identifier_type,
                confidence=0.95,
                reason=f"prefix {normalized[:4]}",
                normalized=normalized,
                field_name=self.field_name,
            )
        return self._detect_uuid(text, base_confidence=0.56, reason="valid UUID payment")


class InvoiceIdentifierStrategy(BaseIdentifierStrategy):
    identifier_type = IdentifierType.INVOICE
    field_name = "invoice_id"
    uuid_field = True

    def __init__(self) -> None:
        if self.field_name in UUID_PROBE_PRIORITY:
            self.uuid_probe_rank = UUID_PROBE_PRIORITY.index(self.field_name)
        else:
            self.uuid_probe_rank = len(UUID_PROBE_PRIORITY)

    def _detect_impl(self, text: str) -> DetectedIdentifier | None:
        return self._detect_uuid(text, base_confidence=0.57, reason="valid UUID")


class LaboratoryIdentifierStrategy(BaseIdentifierStrategy):
    identifier_type = IdentifierType.LABORATORY
    field_name = "laboratory_id"
    uuid_field = True

    def __init__(self) -> None:
        if self.field_name in UUID_PROBE_PRIORITY:
            self.uuid_probe_rank = UUID_PROBE_PRIORITY.index(self.field_name)
        else:
            self.uuid_probe_rank = len(UUID_PROBE_PRIORITY)

    def _detect_impl(self, text: str) -> DetectedIdentifier | None:
        return self._detect_uuid(text, base_confidence=0.55, reason="valid UUID")


class BranchIdentifierStrategy(BaseIdentifierStrategy):
    identifier_type = IdentifierType.BRANCH
    field_name = "branch_id"
    uuid_field = True

    def __init__(self) -> None:
        if self.field_name in UUID_PROBE_PRIORITY:
            self.uuid_probe_rank = UUID_PROBE_PRIORITY.index(self.field_name)
        else:
            self.uuid_probe_rank = len(UUID_PROBE_PRIORITY)

    def _detect_impl(self, text: str) -> DetectedIdentifier | None:
        return self._detect_uuid(text, base_confidence=0.52, reason="valid UUID")


class ProviderReferenceIdentifierStrategy(BaseIdentifierStrategy):
    identifier_type = IdentifierType.PROVIDER_REFERENCE
    field_name = "provider_reference"
    partial_search = True

    def _detect_impl(self, text: str) -> DetectedIdentifier | None:
        if text.startswith(WHATSAPP_PREFIX):
            return None
        normalized = self.normalize(text)
        if not normalized:
            return None
        return DetectedIdentifier(
            identifier_type=self.identifier_type,
            confidence=0.45,
            reason="provider reference fallback",
            normalized=normalized,
            field_name=self.field_name,
        )

    def extract_from_business_audit(self, audit: Any) -> str | None:
        value = self._extract_from_payload(audit)
        if value:
            return value
        provider_ref = getattr(audit, "provider_reference", None)
        if provider_ref and not str(provider_ref).startswith(WHATSAPP_PREFIX):
            return self.normalize(str(provider_ref))
        return None


class WhatsAppIdentifierStrategy(BaseIdentifierStrategy):
    identifier_type = IdentifierType.WHATSAPP_MESSAGE
    field_name = "whatsapp_message_id"
    partial_search = True

    def _detect_impl(self, text: str) -> DetectedIdentifier | None:
        if text.startswith(WHATSAPP_PREFIX):
            return DetectedIdentifier(
                identifier_type=self.identifier_type,
                confidence=0.99,
                reason="prefix wamid.",
                normalized=text,
                field_name=self.field_name,
            )
        return None

    def extract_from_business_audit(self, audit: Any) -> str | None:
        value = self._extract_from_payload(audit)
        if value:
            return value
        provider_ref = getattr(audit, "provider_reference", None)
        if provider_ref and str(provider_ref).startswith(WHATSAPP_PREFIX):
            return str(provider_ref).strip()
        return None

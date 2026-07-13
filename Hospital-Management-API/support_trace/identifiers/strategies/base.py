"""Base identifier strategy with shared detection helpers."""

from __future__ import annotations

import re
from typing import Any

from shared.audit.base_validator import is_valid_uuid

from shared.audit.base_validator import is_valid_uuid

from support_trace.identifiers.constants import (
    PAYMENT_PREFIX,
    PHONE_MAX_DIGITS,
    PHONE_MIN_DIGITS,
    PROVIDER_REFERENCE_MAX_LENGTH,
    RAZORPAY_PREFIX,
    UUID_PROBE_PRIORITY,
    WHATSAPP_PREFIX,
)
from support_trace.identifiers.lookup_keys import normalize_phone, normalize_provider_reference, normalize_uuid
from support_trace.identifiers.types import DetectedIdentifier, IdentifierType


class BaseIdentifierStrategy:
    identifier_type: IdentifierType
    field_name: str
    uuid_field: bool = False
    partial_search: bool = False
    uuid_probe_rank: int | None = None

    def normalize(self, value: str) -> str | None:
        if not value or not str(value).strip():
            return None
        if self.field_name == "phone_number":
            return normalize_phone(value)
        if self.field_name == "provider_reference":
            return normalize_provider_reference(value)
        if self.uuid_field:
            text = str(value).strip()
            if is_valid_uuid(text):
                return normalize_uuid(text)
            return text or None
        return str(value).strip()

    def validate(self, value: str) -> str | None:
        normalized = self.normalize(value)
        if not normalized:
            return "empty value"
        if self.uuid_field and not is_valid_uuid(normalized):
            return "invalid UUID"
        if self.field_name == "phone_number":
            if not (PHONE_MIN_DIGITS <= len(normalized) <= PHONE_MAX_DIGITS):
                return "invalid phone length"
        if self.field_name == "provider_reference":
            if len(normalized) > PROVIDER_REFERENCE_MAX_LENGTH:
                return "provider reference too long"
        if self.field_name == "payment_id":
            if not (
                normalized.startswith(PAYMENT_PREFIX)
                or normalized.startswith(RAZORPAY_PREFIX)
                or is_valid_uuid(normalized)
            ):
                return "invalid payment id format"
        return None

    def supports_partial_search(self) -> bool:
        return self.partial_search

    def detect(self, raw: str) -> DetectedIdentifier | None:
        text = str(raw).strip()
        if not text:
            return None
        return self._detect_impl(text)

    def _detect_impl(self, text: str) -> DetectedIdentifier | None:
        return None

    def extract_from_business_audit(self, audit: Any) -> str | None:
        return self._extract_from_payload(audit)

    def extract_from_clinical_audit(self, audit: Any) -> str | None:
        return self._extract_from_clinical(audit)

    def _extract_from_payload(self, audit: Any) -> str | None:
        payload = getattr(audit, "payload", None) or {}
        if isinstance(payload, dict) and self.field_name in payload and payload[self.field_name]:
            return self.normalize(str(payload[self.field_name]))
        return None

    def _extract_from_clinical(self, audit: Any) -> str | None:
        value = getattr(audit, self.field_name, None)
        if value:
            return self.normalize(str(value))
        return None

    def _detect_uuid(self, text: str, *, base_confidence: float, reason: str) -> DetectedIdentifier | None:
        candidate = normalize_uuid(text)
        if not candidate or not is_valid_uuid(candidate):
            return None
        rank = self.uuid_probe_rank
        if rank is None and self.field_name in UUID_PROBE_PRIORITY:
            rank = UUID_PROBE_PRIORITY.index(self.field_name)
        confidence = base_confidence - (rank or 0) * 0.02
        return DetectedIdentifier(
            identifier_type=self.identifier_type,
            confidence=max(confidence, 0.1),
            reason=reason,
            normalized=candidate,
            field_name=self.field_name,
        )


def _digits_only(text: str) -> str:
    return re.sub(r"\D", "", text)

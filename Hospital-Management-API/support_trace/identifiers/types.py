"""Identifier resolution domain types."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Protocol, runtime_checkable

from django.db import models

from support_trace.identifiers.constants import SearchStrategy
from support_trace.models import SupportTrace


class IdentifierType(models.TextChoices):
    PATIENT = "Patient", "Patient"
    PATIENT_ACCOUNT = "PatientAccount", "Patient Account"
    PATIENT_PROFILE = "PatientProfile", "Patient Profile"
    CONSULTATION = "Consultation", "Consultation"
    ENCOUNTER = "Encounter", "Encounter"
    PRESCRIPTION = "Prescription", "Prescription"
    RECOMMENDATION = "Recommendation", "Recommendation"
    BOOKING = "Booking", "Booking"
    ROUTING = "Routing", "Routing"
    REPORT = "Report", "Report"
    ORDER = "Order", "Order"
    PAYMENT = "Payment", "Payment"
    INVOICE = "Invoice", "Invoice"
    LABORATORY = "Laboratory", "Laboratory"
    BRANCH = "Branch", "Branch"
    PROVIDER_REFERENCE = "ProviderReference", "Provider Reference"
    WHATSAPP_MESSAGE = "WhatsAppMessage", "WhatsApp Message"
    PHONE = "Phone", "Phone"


@dataclass(frozen=True)
class DetectedIdentifier:
    identifier_type: IdentifierType
    confidence: float
    reason: str
    normalized: str
    field_name: str


@dataclass(frozen=True)
class SearchPlanStep:
    strategy: str
    field_name: str
    value: str


@dataclass(frozen=True)
class SearchPlan:
    detected: DetectedIdentifier
    steps: tuple[SearchPlanStep, ...]
    expand_relationships: bool = True


@dataclass
class SearchResult:
    traces: list[SupportTrace] = field(default_factory=list)
    matched_field: str | None = None
    matched_value: str | None = None
    strategy: str | None = None


@dataclass
class IdentifierLookupResult:
    identifier: str
    normalized: str
    detected_type: IdentifierType | None
    matched_field: str | None
    matched_value: str | None
    confidence: float
    strategy: str | None
    traces: list[SupportTrace] = field(default_factory=list)
    related_traces: list[SupportTrace] = field(default_factory=list)
    trace_count: int = 0
    related_trace_count: int = 0
    search_time_ms: float = 0.0


@dataclass(frozen=True)
class IdentifierSyncResult:
    identifiers: dict[str, str]
    identifier_count: int
    first_seen_at: datetime | None
    last_seen_at: datetime | None


@runtime_checkable
class IdentifierStrategy(Protocol):
    identifier_type: IdentifierType
    field_name: str

    def detect(self, raw: str) -> DetectedIdentifier | None: ...

    def normalize(self, value: str) -> str | None: ...

    def validate(self, value: str) -> str | None: ...

    def extract_from_business_audit(self, audit: Any) -> str | None: ...

    def extract_from_clinical_audit(self, audit: Any) -> str | None: ...

    def supports_partial_search(self) -> bool: ...

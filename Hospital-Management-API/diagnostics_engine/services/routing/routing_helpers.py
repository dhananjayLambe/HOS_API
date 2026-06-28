"""Pure helpers: location resolution, distance, pincode parsing, routing scheduling."""

from __future__ import annotations

import logging
import math
import os
import re
from dataclasses import dataclass
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from django.db import transaction

if TYPE_CHECKING:
    from account.models import User
    from diagnostics_engine.models.orders import DiagnosticOrder

logger = logging.getLogger(__name__)

# Human-readable routing pipeline (order → on_commit → location → eligibility → rank → branch).
# Technical steps: DIAGNOSTIC_ROUTING_JOURNEY_LOG=1 or settings.DIAGNOSTICS_ROUTING_JOURNEY_LOG.
# Plain-language patient/tests/lab lines: DIAGNOSTIC_ROUTING_JOURNEY_HUMAN_LOG=1 (also on when journey log is on).
# Set logger ``diagnostics_engine.services.routing`` (or root) to INFO to see messages.
PINCODE_RE = re.compile(r"\b(\d{6})\b")


def routing_journey_log_enabled() -> bool:
    """True when verbose routing journey logs should be emitted (testing / demos)."""
    if os.environ.get("DIAGNOSTIC_ROUTING_JOURNEY_LOG", "").strip().lower() in ("1", "true", "yes", "on"):
        return True
    try:
        from django.conf import settings

        return bool(getattr(settings, "DIAGNOSTICS_ROUTING_JOURNEY_LOG", False))
    except Exception:
        return False


def routing_journey_human_log_enabled() -> bool:
    """True when plain-language patient/test/lab journey lines should be logged."""
    if os.environ.get("DIAGNOSTIC_ROUTING_JOURNEY_HUMAN_LOG", "").strip().lower() in ("1", "true", "yes", "on"):
        return True
    try:
        from django.conf import settings

        return bool(getattr(settings, "DIAGNOSTICS_ROUTING_JOURNEY_HUMAN_LOG", False))
    except Exception:
        return False


def routing_journey_info(msg: str, *args: Any) -> None:
    """INFO log for the routing journey; no-op unless :func:`routing_journey_log_enabled`."""
    if routing_journey_log_enabled():
        logger.info(msg, *args)


def routing_journey_human(msg: str, *args: Any) -> None:
    """
    Plain-language INFO lines for operators (patient + tests + lab outcome).

    Enable with DIAGNOSTIC_ROUTING_JOURNEY_HUMAN_LOG=1 or settings.DIAGNOSTICS_ROUTING_JOURNEY_HUMAN_LOG,
    or turn on DIAGNOSTIC_ROUTING_JOURNEY_LOG (technical journey) which also emits these summaries.
    """
    if routing_journey_human_log_enabled() or routing_journey_log_enabled():
        logger.info(msg, *args)


def privacy_patient_label(full_name: str | None, *, max_chars: int = 22) -> str:
    """Short patient label for logs (truncate with ellipsis)."""
    if not full_name or not str(full_name).strip():
        return "the patient"
    s = str(full_name).strip()
    if len(s) <= max_chars:
        return s
    return s[: max(1, max_chars - 3)] + "..."


def describe_diagnostic_order_tests(order: Any) -> str:
    """Comma-separated service names (or codes) for human routing logs."""
    from diagnostics_engine.models.orders import DiagnosticOrderTestLine

    lines = list(
        DiagnosticOrderTestLine.objects.filter(order_id=order.pk)
        .select_related("service")
        .order_by("service__name", "pk")
    )
    if not lines:
        return "no lab tests on this order yet"
    labels: list[str] = []
    for tl in lines:
        svc = tl.service
        labels.append((svc.name or svc.code or str(svc.pk)).strip())
    if len(labels) <= 4:
        return ", ".join(labels)
    return ", ".join(labels[:4]) + f", and {len(labels) - 4} more"


def routable_lab_branches_queryset():
    """
    Lab branches included in marketplace routing (same pool as EligibilityEngine).

    Pricing and service-area checks must use the same branch set so admin/reconcile
    tools stay aligned with runtime routing.
    """
    from labs.choices.auth import RegistrationStatus
    from labs.models.lab_auth import LabBranch

    return (
        LabBranch.objects.filter(
            is_active=True,
            is_deleted=False,
            is_active_for_orders=True,
            organization__is_active=True,
            organization__is_deleted=False,
            organization__registration_status=RegistrationStatus.APPROVED,
            organization__is_active_for_orders=True,
            organization__is_verified=True,
            organization__onboarding_completed=True,
        )
        .select_related("organization", "address")
    )


@dataclass(frozen=True)
class ResolvedRoutingLocation:
    """Inputs for eligibility + distance; supports incomplete patient data."""

    source: str
    pincode: str | None
    latitude: float | None
    longitude: float | None
    city: str | None
    confidence: str


def extract_pincode_from_text(text: str | None) -> str | None:
    if not text or not str(text).strip():
        return None
    m = PINCODE_RE.search(str(text))
    return m.group(1) if m else None


def normalize_indian_pincode(value: Any) -> str | None:
    """
    Canonical 6-digit pincode for routing comparisons.

    Clinic and service-area rows sometimes store stray whitespace or non-digit
    characters; eligibility matches on BranchServiceArea, not LabAddress.
    """
    if value is None:
        return None
    s = str(value).strip()
    if not s or s.upper() == "NA":
        return None
    m = PINCODE_RE.search(s)
    if m:
        return m.group(1)
    digits = "".join(ch for ch in s if ch.isdigit())
    return digits if len(digits) == 6 else None


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(min(1.0, math.sqrt(a)))


def _decimal_or_none(val: Any) -> Decimal | None:
    if val is None or val == "" or str(val).upper() == "NA":
        return None
    try:
        return Decimal(str(val))
    except Exception:
        return None


def resolve_patient_legacy_row(patient_profile: Any) -> Any:
    """Map PatientProfile → legacy patient.patient row when present."""
    if patient_profile is None:
        return None
    acc = getattr(patient_profile, "account", None)
    if acc is None:
        return None
    user = getattr(acc, "user", None)
    if user is None:
        return None
    from patient.models import patient as PatientRow

    return PatientRow.objects.filter(user_id=user.pk).first()


def resolve_routing_location_for_context(
    *,
    encounter: Any,
    patient_profile: Any,
    collection_mode: str,
) -> ResolvedRoutingLocation:
    """
    India-focused fallback: patient → clinic (same rules as resolve_routing_location).

    Does not require a DiagnosticOrder.
    """
    from diagnostics_engine.choices.routing import (
        RecommendationConfidence,
        RoutingLocationSource,
    )

    clinic = encounter.clinic if encounter else None
    patient_row = resolve_patient_legacy_row(patient_profile)

    clinic_addr = None
    if clinic is not None:
        clinic_addr = getattr(clinic, "address", None)

    clinic_pin = None
    clinic_lat = clinic_lon = None
    clinic_city = None
    if clinic_addr is not None:
        clinic_pin = normalize_indian_pincode(getattr(clinic_addr, "pincode", None))
        clinic_lat = _decimal_or_none(getattr(clinic_addr, "latitude", None))
        clinic_lon = _decimal_or_none(getattr(clinic_addr, "longitude", None))
        clinic_city = clinic_addr.city if getattr(clinic_addr, "city", None) not in (None, "NA") else None

    patient_pin = normalize_indian_pincode(
        extract_pincode_from_text(getattr(patient_row, "address", None) if patient_row else None)
    )
    patient_lat = patient_lon = None

    mode = collection_mode or "lab"

    if mode == "home":
        if patient_pin:
            return ResolvedRoutingLocation(
                source=RoutingLocationSource.PATIENT_PINCODE,
                pincode=patient_pin,
                latitude=patient_lat,
                longitude=patient_lon,
                city=None,
                confidence=RecommendationConfidence.MEDIUM,
            )
        if clinic_pin:
            return ResolvedRoutingLocation(
                source=RoutingLocationSource.CLINIC_PINCODE,
                pincode=clinic_pin,
                latitude=_float_or_none(clinic_lat),
                longitude=_float_or_none(clinic_lon),
                city=clinic_city,
                confidence=RecommendationConfidence.LOW,
            )
        return ResolvedRoutingLocation(
            source=RoutingLocationSource.CITY_LEVEL,
            pincode=None,
            latitude=_float_or_none(clinic_lat),
            longitude=_float_or_none(clinic_lon),
            city=clinic_city,
            confidence=RecommendationConfidence.LOW,
        )

    if patient_pin:
        return ResolvedRoutingLocation(
            source=RoutingLocationSource.PATIENT_PINCODE,
            pincode=patient_pin,
            latitude=patient_lat,
            longitude=patient_lon,
            city=None,
            confidence=RecommendationConfidence.MEDIUM,
        )
    if clinic_pin:
        return ResolvedRoutingLocation(
            source=RoutingLocationSource.CLINIC_PINCODE,
            pincode=clinic_pin,
            latitude=_float_or_none(clinic_lat),
            longitude=_float_or_none(clinic_lon),
            city=clinic_city,
            confidence=RecommendationConfidence.LOW,
        )
    if clinic_lat is not None and clinic_lon is not None:
        return ResolvedRoutingLocation(
            source=RoutingLocationSource.CLINIC_LOCATION,
            pincode=None,
            latitude=_float_or_none(clinic_lat),
            longitude=_float_or_none(clinic_lon),
            city=clinic_city,
            confidence=RecommendationConfidence.LOW,
        )
    return ResolvedRoutingLocation(
        source=RoutingLocationSource.CITY_LEVEL,
        pincode=None,
        latitude=None,
        longitude=None,
        city=clinic_city,
        confidence=RecommendationConfidence.LOW,
    )


def resolve_routing_location(order: DiagnosticOrder) -> ResolvedRoutingLocation:
    """
    India-focused fallback: patient → clinic.

    Home collection: pincode from patient address text, then clinic pincode.
    Lab visit: patient pincode, clinic pincode, clinic coordinates, city-level.
    """
    encounter = order.encounter
    profile = order.patient_profile
    mode = order.sample_collection_mode or "lab"
    return resolve_routing_location_for_context(
        encounter=encounter,
        patient_profile=profile,
        collection_mode=mode,
    )


def _float_or_none(d: Decimal | None) -> float | None:
    if d is None:
        return None
    try:
        return float(d)
    except Exception:
        return None


def schedule_routing_after_commit(
    order_id: Any,
    *,
    triggered_by_id: int | None = None,
    engine_version: str = "v1",
) -> None:
    """Register post-commit routing; never raises through to the consultation transaction."""

    routing_journey_info(
        "[routing journey] Order %s: queued automatic lab routing (runs right after this DB transaction "
        "commits). Triggered_by_user_id=%s engine=%s — next steps: resolve location → evaluate all labs → "
        "rank eligible → assign winning branch.",
        order_id,
        triggered_by_id,
        engine_version,
    )

    def _run() -> None:
        try:
            routing_journey_info(
                "[routing journey] Order %s: on_commit fired — starting RoutingService (async to consultation save).",
                order_id,
            )
            from diagnostics_engine.services.routing.routing_service import RoutingService

            RoutingService.start_routing_for_order(
                order_id,
                triggered_by_id=triggered_by_id,
                engine_version=engine_version,
            )
        except Exception:
            logger.exception(
                "diagnostic routing on_commit failed order_id=%s triggered_by_id=%s",
                order_id,
                triggered_by_id,
            )

    transaction.on_commit(_run)

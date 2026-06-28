"""Serializers for Marketplace Recommendation Platform API (M3)."""

from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any
from uuid import UUID

from django.conf import settings
from django.utils import timezone
from rest_framework import serializers, status

from diagnostics_engine.domain.recommendation import (
    ExpandedTestLine,
    PackageSummary,
    RecommendationFailureReason,
    RecommendationResult,
)
from labs.models.lab_auth import LabBranch

RECOMMENDATION_VERSION = "v1"
ROUTING_VERSION = "v1"

WHY_RECOMMENDED = {
    "recommended": "Best overall score",
    "fastest": "Fastest turnaround",
    "cheapest": "Lowest price",
    "nearest": "Nearest laboratory",
    "best_value": "Best value",
}

FAILURE_MESSAGES = {
    RecommendationFailureReason.NO_CONSULTATION: "Consultation is required.",
    RecommendationFailureReason.NO_ENCOUNTER: "Consultation is missing an encounter.",
    RecommendationFailureReason.NO_INVESTIGATIONS: "No active investigations on this consultation.",
    RecommendationFailureReason.ONLY_CUSTOM_INVESTIGATIONS: "Only custom investigations are present; catalog tests are required.",
    RecommendationFailureReason.NO_ELIGIBLE_LABORATORY: "No laboratory can fulfill this request at the selected location.",
    RecommendationFailureReason.PRICING_FAILURE: "Unable to quote price for the recommended laboratory.",
    RecommendationFailureReason.LOCATION_MISSING: "Patient or clinic location is required for recommendation.",
    RecommendationFailureReason.VALIDATION_ERROR: "Investigation data is invalid for recommendation.",
    "CONSULTATION_NOT_FOUND": "Consultation not found.",
    "PERMISSION_DENIED": "Not permitted to access this consultation.",
    "INTERNAL_ERROR": "An unexpected error occurred.",
}

NEXT_ACTION = {
    RecommendationFailureReason.NO_ELIGIBLE_LABORATORY: "CHANGE_LOCATION",
    RecommendationFailureReason.NO_INVESTIGATIONS: "ADD_INVESTIGATIONS",
    RecommendationFailureReason.ONLY_CUSTOM_INVESTIGATIONS: "REMOVE_CUSTOM_TEST",
    RecommendationFailureReason.LOCATION_MISSING: "CHANGE_LOCATION",
    RecommendationFailureReason.PRICING_FAILURE: "TRY_AGAIN",
    RecommendationFailureReason.NO_ENCOUNTER: "CONTACT_SUPPORT",
    RecommendationFailureReason.NO_CONSULTATION: "CONTACT_SUPPORT",
    RecommendationFailureReason.VALIDATION_ERROR: "CONTACT_SUPPORT",
}


def _ttl_seconds() -> int:
    return int(getattr(settings, "MARKETPLACE_RECOMMENDATION_TTL_SECONDS", 900))


def _decimal_str(value: Decimal | float | int | None) -> str | None:
    if value is None:
        return None
    return format(Decimal(str(value)), "f")


def _split_labels(labels: list[str]) -> tuple[str | None, list[str]]:
    if not labels:
        return None, []
    if "recommended" in labels:
        primary = "recommended"
        secondary = [l for l in labels if l != "recommended"]
        return primary, secondary
    return labels[0], list(labels[1:])


def _why_recommended(labels: list[str]) -> list[str]:
    out: list[str] = []
    for label in labels:
        text = WHY_RECOMMENDED.get(label)
        if text and text not in out:
            out.append(text)
    return out


def _failure_http_status(failure_reason: str | None) -> int:
    if failure_reason in (
        RecommendationFailureReason.NO_ELIGIBLE_LABORATORY,
        RecommendationFailureReason.PRICING_FAILURE,
    ):
        return status.HTTP_409_CONFLICT
    return status.HTTP_400_BAD_REQUEST


def _serialize_lab(org) -> dict[str, Any] | None:
    if org is None:
        return None
    logo_url = None
    if org.logo:
        try:
            logo_url = org.logo.url
        except Exception:
            logo_url = None
    return {
        "id": str(org.id),
        "display_name": org.display_name or org.organization_name,
        "logo_url": logo_url,
        "verified": bool(org.is_verified),
        "rating": None,
    }


def _load_branch(branch: LabBranch | None) -> LabBranch | None:
    if branch is None:
        return None
    return (
        LabBranch.objects.select_related("organization", "address")
        .filter(pk=branch.pk)
        .first()
    )


def _format_branch_address(addr) -> str | None:
    if addr is None:
        return None
    parts: list[str] = []
    for value in (
        getattr(addr, "address_line_1", None),
        getattr(addr, "address_line_2", None),
        getattr(addr, "landmark", None),
        getattr(addr, "city", None),
        getattr(addr, "state", None),
        getattr(addr, "pincode", None),
    ):
        if value and str(value).strip():
            parts.append(str(value).strip())
    return ", ".join(parts) if parts else None


def _branch_working_hours(branch: LabBranch) -> dict[str, str] | None:
    if branch.opening_time is None or branch.closing_time is None:
        return None
    opening = branch.opening_time.strftime("%H:%M")
    closing = branch.closing_time.strftime("%H:%M")
    return {
        "opening": opening,
        "closing": closing,
        "display": f"{opening} – {closing}",
    }


def _google_maps_url(lat, lon) -> str | None:
    if lat is None or lon is None:
        return None
    try:
        return f"https://www.google.com/maps/search/?api=1&query={float(lat)},{float(lon)}"
    except (TypeError, ValueError):
        return None


def _branch_contact_number(branch: LabBranch, org) -> str | None:
    meta = branch.metadata if isinstance(branch.metadata, dict) else {}
    contact = meta.get("contact_number") or meta.get("branch_contact_number")
    if contact:
        return str(contact).strip() or None
    org_number = getattr(org, "primary_contact_number", None)
    return str(org_number).strip() if org_number else None


def _branch_channel_fields(loaded: LabBranch | None) -> dict[str, Any]:
    """Top-level channel fields for WhatsApp / mobile (presentation only)."""
    if loaded is None:
        return {
            "branch_address": None,
            "branch_contact_number": None,
            "branch_working_hours": None,
            "google_maps_url": None,
            "available_slot_dates": None,
        }
    addr = getattr(loaded, "address", None)
    org = loaded.organization
    lat = getattr(addr, "latitude", None)
    lon = getattr(addr, "longitude", None)
    return {
        "branch_address": _format_branch_address(addr),
        "branch_contact_number": _branch_contact_number(loaded, org),
        "branch_working_hours": _branch_working_hours(loaded),
        "google_maps_url": _google_maps_url(lat, lon),
        "available_slot_dates": None,
    }


def _serialize_branch(loaded: LabBranch | None) -> dict[str, Any] | None:
    if loaded is None:
        return None
    org = loaded.organization
    addr = getattr(loaded, "address", None)
    return {
        "id": str(loaded.id),
        "name": loaded.branch_name,
        "code": loaded.branch_code,
        "address": _format_branch_address(addr),
        "city": getattr(addr, "city", None),
        "pincode": getattr(addr, "pincode", None),
        "latitude": _decimal_str(getattr(addr, "latitude", None)),
        "longitude": _decimal_str(getattr(addr, "longitude", None)),
        "phone": _branch_contact_number(loaded, org),
    }


def _collection_flags(branch: LabBranch | None, collection_mode: str) -> tuple[bool, bool]:
    if branch is None:
        home = collection_mode == "home"
        return home, not home
    org = branch.organization
    home = bool(
        branch.home_collection_available
        and org.home_collection_available
    )
    lab_visit = bool(branch.walk_in_collection_available)
    return home, lab_visit


def _serialize_test(line: ExpandedTestLine) -> dict[str, Any]:
    return {
        "service_id": line.service_id,
        "code": line.code,
        "name": line.name,
        "quantity": line.quantity,
        "investigation_item_id": line.investigation_item_id,
        "package_id": line.package_id,
    }


def _serialize_package(pkg: PackageSummary) -> dict[str, Any]:
    return {
        "investigation_item_id": pkg.investigation_item_id,
        "package_id": pkg.package_id,
        "name": pkg.name,
        "code": pkg.code,
    }


class MarketplaceRecommendationRequestSerializer(serializers.Serializer):
    consultation_id = serializers.UUIDField()
    client_request_id = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=128,
    )


class MarketplaceRecommendationResponseBuilder:
    """Build nested API envelope from domain RecommendationResult."""

    @classmethod
    def from_result(
        cls,
        result: RecommendationResult,
        *,
        recommendation_id: UUID,
        request_id: str,
        client_request_id: str | None,
        duration_ms: int,
        generated_at: datetime | None = None,
    ) -> tuple[dict[str, Any], int]:
        now = generated_at or timezone.now()
        ttl = _ttl_seconds()
        expires_at = now + timedelta(seconds=ttl)

        metadata = {
            "recommendation_id": str(recommendation_id),
            "request_id": request_id,
            "client_request_id": client_request_id or None,
            "recommendation_version": RECOMMENDATION_VERSION,
            "routing_version": ROUTING_VERSION,
            "catalog_version": None,
            "pricing_version": None,
            "generated_at": now.isoformat(),
            "expires_at": expires_at.isoformat(),
            "expires_in_seconds": ttl,
            "duration_ms": duration_ms,
        }

        tests = [_serialize_test(t) for t in result.expanded_tests]
        packages = [_serialize_package(p) for p in result.packages]

        home_avail, lab_avail = _collection_flags(result.recommended_branch, result.collection_mode)
        primary_label, secondary_labels = _split_labels(list(result.ranking_labels))
        loaded_branch = _load_branch(result.recommended_branch)
        channel_fields = _branch_channel_fields(loaded_branch)

        recommendation_body: dict[str, Any] = {
            "available": result.available,
            "consultation_id": str(result.consultation_id),
            "collection_mode": result.collection_mode,
            "home_collection_available": home_avail,
            "lab_visit_available": lab_avail,
            **channel_fields,
            "lab": _serialize_lab(result.recommended_lab),
            "branch": _serialize_branch(loaded_branch),
            "quoted_price": _decimal_str(result.quoted_price),
            "mrp": _decimal_str(result.mrp_total),
            "savings": _decimal_str(result.savings),
            "routing_estimated_price": _decimal_str(result.routing_estimated_price),
            "pricing_source": result.pricing_source,
            "estimated_distance_km": result.estimated_distance_km,
            "estimated_tat_hours": result.estimated_tat_hours,
            "routing_score": _decimal_str(result.routing_score),
            "primary_label": primary_label,
            "secondary_labels": secondary_labels,
            "why_recommended": _why_recommended(list(result.ranking_labels)),
        }

        error = None
        http_status = status.HTTP_200_OK
        if not result.available:
            code = result.failure_reason or RecommendationFailureReason.VALIDATION_ERROR
            error = {
                "code": code,
                "message": FAILURE_MESSAGES.get(code, FAILURE_MESSAGES[RecommendationFailureReason.VALIDATION_ERROR]),
                "next_action": NEXT_ACTION.get(code, "CONTACT_SUPPORT"),
            }
            http_status = _failure_http_status(code)

        payload = {
            "metadata": metadata,
            "recommendation": recommendation_body,
            "tests": tests,
            "packages": packages,
            "error": error,
        }
        return payload, http_status

    @classmethod
    def error_envelope(
        cls,
        *,
        code: str,
        message: str,
        next_action: str,
        http_status: int,
        recommendation_id: UUID,
        request_id: str,
        client_request_id: str | None = None,
        consultation_id: UUID | None = None,
        duration_ms: int = 0,
    ) -> tuple[dict[str, Any], int]:
        now = timezone.now()
        ttl = _ttl_seconds()
        payload = {
            "metadata": {
                "recommendation_id": str(recommendation_id),
                "request_id": request_id,
                "client_request_id": client_request_id or None,
                "recommendation_version": RECOMMENDATION_VERSION,
                "routing_version": ROUTING_VERSION,
                "catalog_version": None,
                "pricing_version": None,
                "generated_at": now.isoformat(),
                "expires_at": (now + timedelta(seconds=ttl)).isoformat(),
                "expires_in_seconds": ttl,
                "duration_ms": duration_ms,
            },
            "recommendation": {
                "available": False,
                "consultation_id": str(consultation_id) if consultation_id else None,
            },
            "tests": [],
            "packages": [],
            "error": {
                "code": code,
                "message": message,
                "next_action": next_action,
            },
        }
        return payload, http_status

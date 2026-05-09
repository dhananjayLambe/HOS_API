"""
Nested payload validation for public lab onboarding (POST /api/labs/onboarding/).
Accepts canonical keys plus legacy aliases from the Next.js proxy (kyc_details, address, address2).
"""

from __future__ import annotations

import re

from django.contrib.auth import get_user_model
from rest_framework import serializers

from labs.models import LabOrganization, LabType

User = get_user_model()

_MOBILE_RE = re.compile(r"^[6-9]\d{9}$")
_PINCODE_RE = re.compile(r"^[1-9]\d{5}$")
_PAN_RE = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")
_GSTIN_RE = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$")

LAB_TYPE_LABEL_MAP = {
    "Diagnostic Center": LabType.DIAGNOSTIC_CENTER,
    "Pathology Lab": LabType.PATHOLOGY_LAB,
    "Radiology Center": LabType.RADIOLOGY_CENTER,
    "Clinic Lab": LabType.CLINIC_LAB,
    "Hospital Lab": LabType.HOSPITAL_LAB,
    "Multispeciality Diagnostics": LabType.MULTISPECIALITY_DIAGNOSTICS,
}


def resolve_lab_type(value: str) -> str:
    """Return a LabType enum value string."""
    if not value or not str(value).strip():
        return LabType.DIAGNOSTIC_CENTER
    v = str(value).strip()
    if v in LabType.values:
        return v
    return LAB_TYPE_LABEL_MAP.get(v, LabType.DIAGNOSTIC_CENTER)


class AdminDetailsSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150, trim_whitespace=True)
    last_name = serializers.CharField(max_length=150, trim_whitespace=True, allow_blank=True, default="")
    username = serializers.CharField(max_length=32, trim_whitespace=True)
    email = serializers.EmailField(required=False, allow_blank=True, default="")
    designation = serializers.CharField(max_length=64, trim_whitespace=True, allow_blank=True, default="")
    whatsapp_same_as_mobile = serializers.BooleanField(required=False, default=True)

    def validate_username(self, value: str) -> str:
        mobile = value.strip()
        if not _MOBILE_RE.match(mobile):
            raise serializers.ValidationError("Username must be a valid 10-digit Indian mobile number.")
        if User.objects.filter(username=mobile).exists():
            raise serializers.ValidationError(
                "An account with this mobile number already exists. Try logging in or use a different number."
            )
        return mobile


class LabDetailsSerializer(serializers.Serializer):
    organization_name = serializers.CharField(max_length=255, trim_whitespace=True)
    display_name = serializers.CharField(max_length=255, trim_whitespace=True)
    lab_type = serializers.CharField(max_length=64, trim_whitespace=True)
    home_sample_collection = serializers.BooleanField(default=False)
    walk_in_collection = serializers.BooleanField(default=True)
    license_number = serializers.CharField(
        max_length=100, required=False, allow_blank=True, allow_null=True, default=""
    )
    registration_number = serializers.CharField(
        max_length=100, required=False, allow_blank=True, allow_null=True, default=""
    )
    lab_name = serializers.CharField(required=False, allow_blank=True, default="")
    license_valid_till = serializers.CharField(required=False, allow_blank=True, default="")
    certifications = serializers.CharField(required=False, allow_blank=True, default="")
    service_categories = serializers.ListField(
        child=serializers.CharField(max_length=120), required=False, allow_empty=True
    )
    pricing_tier = serializers.CharField(required=False, allow_blank=True, default="")
    turnaround_time_hours = serializers.IntegerField(
        required=False, allow_null=True, min_value=1, max_value=168, default=24
    )


class AddressDetailsSerializer(serializers.Serializer):
    address_line_1 = serializers.CharField(max_length=255, trim_whitespace=True)
    address_line_2 = serializers.CharField(required=False, allow_blank=True, default="")
    landmark = serializers.CharField(required=False, allow_blank=True, default="")
    city = serializers.CharField(max_length=100, trim_whitespace=True)
    state = serializers.CharField(max_length=100, trim_whitespace=True)
    pincode = serializers.CharField(max_length=10, trim_whitespace=True)
    latitude = serializers.FloatField(required=False, allow_null=True)
    longitude = serializers.FloatField(required=False, allow_null=True)

    def validate_pincode(self, value: str) -> str:
        p = value.strip()
        if not _PINCODE_RE.match(p):
            raise serializers.ValidationError("Pincode must be 6 digits (valid Indian PIN).")
        return p

    def validate(self, attrs: dict) -> dict:
        # UI / proxy often sends 0,0 as placeholder — do not persist invalid coordinates
        lat, lon = attrs.get("latitude"), attrs.get("longitude")
        try:
            flat = float(lat) if lat is not None else None
            flon = float(lon) if lon is not None else None
        except (TypeError, ValueError):
            return attrs
        if flat == 0.0 and flon == 0.0:
            attrs["latitude"] = None
            attrs["longitude"] = None
        return attrs


class ComplianceDetailsSerializer(serializers.Serializer):
    pan_number = serializers.CharField(required=False, allow_blank=True, default="")
    gst_number = serializers.CharField(required=False, allow_blank=True, default="")
    lab_license_file_name = serializers.CharField(required=False, allow_blank=True, default="")
    nabl_certificate_file_name = serializers.CharField(required=False, allow_blank=True, default="")
    kyc_document_type = serializers.CharField(required=False, allow_blank=True, default="")
    kyc_document_number = serializers.CharField(required=False, allow_blank=True, default="")
    # data URL (e.g. data:application/pdf;base64,...) or raw base64 from client
    lab_license_file_base64 = serializers.CharField(required=False, allow_blank=True, default="")
    nabl_certificate_file_base64 = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs: dict) -> dict:
        pan = (attrs.get("pan_number") or "").strip().upper()
        gst = (attrs.get("gst_number") or "").strip().upper()
        if pan and not _PAN_RE.match(pan):
            raise serializers.ValidationError({"pan_number": "Invalid PAN format."})
        if gst and not _GSTIN_RE.match(gst):
            raise serializers.ValidationError({"gst_number": "Invalid GSTIN format (15 characters)."})
        attrs["pan_number"] = pan
        attrs["gst_number"] = gst

        # Rough size guard without full decode (base64 ≈ 4/3 of binary size)
        max_b64 = 16 * 1024 * 1024  # ~12 MiB binary upper bound
        for key in ("lab_license_file_base64", "nabl_certificate_file_base64"):
            raw = (attrs.get(key) or "").strip()
            if raw and len(raw) > max_b64:
                raise serializers.ValidationError({key: "File payload is too large (max ~12 MB per file)."})
        return attrs


class LabOnboardingSerializer(serializers.Serializer):
    admin_details = AdminDetailsSerializer()
    lab_details = LabDetailsSerializer()
    address_details = AddressDetailsSerializer()
    compliance_details = ComplianceDetailsSerializer(required=False)

    def to_internal_value(self, data):
        if not isinstance(data, dict):
            return super().to_internal_value(data)

        payload = {**data}

        if "compliance_details" not in payload and payload.get("kyc_details"):
            payload["compliance_details"] = payload["kyc_details"]

        addr = payload.get("address_details")
        if isinstance(addr, dict):
            addr = {**addr}
            if not addr.get("address_line_1") and addr.get("address"):
                addr["address_line_1"] = addr["address"]
            if not addr.get("address_line_2") and addr.get("address2"):
                addr["address_line_2"] = addr["address2"]
            payload["address_details"] = addr

        if "compliance_details" not in payload or payload.get("compliance_details") is None:
            payload["compliance_details"] = {}

        return super().to_internal_value(payload)

    def validate_lab_details(self, value: dict) -> dict:
        value = {**value}
        value.setdefault("service_categories", [])
        value["lab_type_resolved"] = resolve_lab_type(value.get("lab_type", ""))
        return value

    def validate(self, attrs: dict) -> dict:
        if not attrs.get("compliance_details"):
            attrs["compliance_details"] = {}

        org_name = (attrs.get("lab_details") or {}).get("organization_name", "").strip()
        if org_name and LabOrganization.objects.filter(organization_name__iexact=org_name).exists():
            raise serializers.ValidationError(
                {"lab_details": {"organization_name": "A lab with this organization name is already registered."}}
            )
        return attrs

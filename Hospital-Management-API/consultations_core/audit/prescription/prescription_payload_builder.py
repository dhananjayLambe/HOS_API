"""Payload builders for prescription audit events."""

from __future__ import annotations

from typing import Any

from clinical_audit.domain.utils import sanitize_audit_payload

from consultations_core.audit.prescription.constants import MAX_CHANGED_FIELDS
from consultations_core.models.prescription import PrescriptionStatus


class PrescriptionPayloadBuilder:
    """Builds sanitized payload dicts for prescription audit events."""

    @staticmethod
    def build_created(*, medicine_count: int, prescription_type: str = "Digital") -> dict[str, Any]:
        return sanitize_audit_payload(
            {
                "medicine_count": medicine_count,
                "prescription_type": prescription_type,
                "is_signed": False,
            }
        )

    @staticmethod
    def build_updated(*, changed_fields: list[str] | None = None) -> dict[str, Any]:
        fields = list(changed_fields or [])
        if len(fields) > MAX_CHANGED_FIELDS:
            fields = fields[:MAX_CHANGED_FIELDS]
        return sanitize_audit_payload({"changed_fields": fields})

    @staticmethod
    def build_signed(
        *,
        finalized_at,
        signature_type: str = "Digital",
        doctor_license: str | None = None,
    ) -> dict[str, Any]:
        signed_at = finalized_at
        if signed_at is not None and hasattr(signed_at, "isoformat"):
            signed_at = signed_at.isoformat()
        return sanitize_audit_payload(
            {
                "signed_at": signed_at,
                "signature_type": signature_type,
                "doctor_license": doctor_license,
                "finalized": True,
            }
        )

    @staticmethod
    def build_downloaded(
        *,
        downloaded_by: str,
        download_format: str = "PDF",
    ) -> dict[str, Any]:
        return sanitize_audit_payload(
            {
                "downloaded_by": downloaded_by,
                "download_format": download_format,
            }
        )

    @staticmethod
    def prescription_state_from_header(
        *,
        medicine_count: int,
        status: str,
        version_number: int | None = None,
    ) -> dict[str, Any]:
        return {
            "medicine_count": medicine_count,
            "status": status,
            "version_number": version_number,
        }

    @staticmethod
    def diff_prescription_fields(
        prior: dict[str, Any] | None,
        *,
        medicine_count: int,
        status: str,
        version_number: int | None = None,
    ) -> list[str]:
        from consultations_core.audit.prescription.constants import PRESCRIPTION_TRACKED_FIELDS

        current = PrescriptionPayloadBuilder.prescription_state_from_header(
            medicine_count=medicine_count,
            status=status,
            version_number=version_number,
        )
        prior = prior or {}
        return [
            field
            for field in PRESCRIPTION_TRACKED_FIELDS
            if prior.get(field) != current.get(field)
        ]

    @staticmethod
    def resolve_doctor_license(encounter) -> str | None:
        doctor = getattr(encounter, "doctor", None)
        if doctor is None:
            return None
        for attr in ("license_number", "medical_license", "registration_number"):
            value = getattr(doctor, attr, None)
            if value:
                return str(value).strip() or None
        return None

    @staticmethod
    def medicine_count_for(prescription) -> int:
        if hasattr(prescription, "lines"):
            return prescription.lines.count()
        return 0

    @staticmethod
    def is_finalized(prescription) -> bool:
        return getattr(prescription, "status", None) == PrescriptionStatus.FINALIZED

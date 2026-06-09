"""Channel-agnostic prescription summary for outbound notifications."""

from __future__ import annotations

from typing import Any

from django.conf import settings

from consultations_core.services.consultation_summary_service import (
    _build_doctor,
    _build_prescriptions,
    _first_non_empty,
)


class PrescriptionSummaryBuilder:
    """Build truncated medicine/test summaries for WhatsApp, SMS, email, etc."""

    @classmethod
    def max_medicines(cls) -> int:
        return int(getattr(settings, "WHATSAPP_SUMMARY_MAX_MEDICINES", 5))

    @classmethod
    def max_tests(cls) -> int:
        return int(getattr(settings, "WHATSAPP_SUMMARY_MAX_TESTS", 5))

    @classmethod
    def build_whatsapp_summary(cls, *, prescription, prescription_url: str) -> dict[str, Any]:
        consultation = prescription.consultation
        encounter = consultation.encounter
        profile = encounter.patient_profile
        account = encounter.patient_account
        user = getattr(account, "user", None)

        patient_name = cls._patient_display_name(profile, user)
        doctor_block = _build_doctor(encounter)
        doctor_name = doctor_block.get("full_name") or "Doctor"
        if doctor_name and not doctor_name.lower().startswith("dr"):
            doctor_name = f"Dr. {doctor_name}"

        clinic = encounter.clinic
        clinic_name = _first_non_empty(clinic, ("name", "clinic_name")) or "DoctorPro"

        medicine_rows = cls._build_medicine_rows(consultation)
        test_rows = cls._build_test_rows(consultation)

        max_meds = cls.max_medicines()
        max_tests = cls.max_tests()
        shown_meds = medicine_rows[:max_meds]
        shown_tests = test_rows[:max_tests]
        med_truncated = max(0, len(medicine_rows) - len(shown_meds))
        test_truncated = max(0, len(test_rows) - len(shown_tests))

        summary: dict[str, Any] = {
            "channel": "whatsapp",
            "patient_name": patient_name,
            "doctor_name": doctor_name,
            "clinic_name": clinic_name,
            "medicine_summary": shown_meds,
            "medicine_total_count": len(medicine_rows),
            "medicine_truncated_count": med_truncated,
            "test_summary": shown_tests,
            "test_total_count": len(test_rows),
            "test_truncated_count": test_truncated,
            "prescription_url": prescription_url,
        }
        return summary

    @classmethod
    def _build_medicine_rows(cls, consultation) -> list[dict[str, Any]]:
        rows = []
        for line_data in _build_prescriptions(consultation):
            name = (line_data.get("drug_name") or "").strip()
            if not name:
                continue
            dose_display = cls._compact_dose(line_data)
            timing_display = (
                (line_data.get("instructions") or "").strip()
                or (line_data.get("frequency_display") or "").strip()
            )
            duration_display = (line_data.get("duration_display") or "").strip()
            detail_parts = [p for p in (dose_display, timing_display, duration_display) if p]
            detail_line = " · ".join(detail_parts)
            line_text = f"{name}\n{detail_line}" if detail_line else name
            rows.append(
                {
                    "name": name,
                    "dose_display": dose_display,
                    "timing_display": timing_display,
                    "duration_display": duration_display,
                    "line_text": line_text,
                }
            )
        return rows

    @classmethod
    def _build_test_rows(cls, consultation) -> list[dict[str, str]]:
        investigations = getattr(consultation, "investigations", None)
        if not investigations:
            return []
        rows = []
        for item in investigations.items.all():
            name = (item.name or "").strip()
            if name:
                rows.append({"name": name})
        return rows

    @staticmethod
    def _compact_dose(line_data: dict) -> str:
        numeric = (line_data.get("dose_display_numeric") or "").strip()
        if numeric and numeric != "SOS":
            return numeric
        legacy = (line_data.get("dosage_display") or "").strip()
        return legacy

    @staticmethod
    def _patient_display_name(profile, user) -> str:
        first = (getattr(profile, "first_name", None) or "").strip()
        last = (getattr(profile, "last_name", None) or "").strip()
        full = f"{first} {last}".strip()
        if full:
            return full
        if user is not None:
            return (getattr(user, "first_name", None) or getattr(user, "username", None) or "Patient").strip()
        return "Patient"

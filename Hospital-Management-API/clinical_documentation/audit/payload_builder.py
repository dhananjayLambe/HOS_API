"""Payload builders for clinical documentation audit events."""

from __future__ import annotations

from typing import Any

from clinical_audit.domain.utils import sanitize_audit_payload

from clinical_documentation.audit.constants import MAX_CHANGED_FIELDS


class ClinicalDocumentationPayloadBuilder:
    """Builds sanitized payload dicts for clinical documentation audit events."""

    @staticmethod
    def build_diagnosis_added(*, diagnosis_row) -> dict[str, Any]:
        code = getattr(diagnosis_row, "icd_code", None)
        if not code and getattr(diagnosis_row, "master", None) is not None:
            code = getattr(diagnosis_row.master, "icd10_code", None)
        name = (
            getattr(diagnosis_row, "display_name", None)
            or getattr(diagnosis_row, "label", None)
        )
        return sanitize_audit_payload(
            {
                "diagnosis_code": code,
                "diagnosis_name": name,
                "classification": getattr(diagnosis_row, "diagnosis_type", None),
                "is_primary": bool(getattr(diagnosis_row, "is_primary", False)),
                "severity": getattr(diagnosis_row, "severity", None),
            }
        )

    @staticmethod
    def build_diagnosis_updated(*, changed_fields: list[str] | None = None) -> dict[str, Any]:
        fields = list(changed_fields or [])
        if len(fields) > MAX_CHANGED_FIELDS:
            fields = fields[:MAX_CHANGED_FIELDS]
        return sanitize_audit_payload({"changed_fields": fields})

    @staticmethod
    def build_allergy_added(*, allergy_entry: dict[str, Any]) -> dict[str, Any]:
        return sanitize_audit_payload(
            {
                "allergen": allergy_entry.get("allergen"),
                "reaction": allergy_entry.get("reaction"),
                "severity": allergy_entry.get("severity"),
            }
        )

    @staticmethod
    def build_allergy_updated(*, changed_fields: list[str] | None = None) -> dict[str, Any]:
        fields = list(changed_fields or [])
        if len(fields) > MAX_CHANGED_FIELDS:
            fields = fields[:MAX_CHANGED_FIELDS]
        return sanitize_audit_payload({"changed_fields": fields})

    @staticmethod
    def build_clinical_notes_updated(
        *,
        section: str,
        changed_fields: list[str] | None = None,
    ) -> dict[str, Any]:
        fields = list(changed_fields or [])
        if len(fields) > MAX_CHANGED_FIELDS:
            fields = fields[:MAX_CHANGED_FIELDS]
        return sanitize_audit_payload(
            {
                "section": section,
                "changed_fields": fields,
            }
        )

    @staticmethod
    def build_vital_signs_recorded(*, vitals_data: dict[str, Any] | None) -> dict[str, Any]:
        data = vitals_data or {}
        bp = data.get("bp") or data.get("blood_pressure") or {}
        sys_v = dia_v = None
        if isinstance(bp, dict):
            sys_v = bp.get("systolic")
            dia_v = bp.get("diastolic")
        elif isinstance(bp, str) and "/" in bp:
            parts = bp.split("/", 1)
            sys_v, dia_v = parts[0].strip(), parts[1].strip()

        height_cm = data.get("height_cm")
        if height_cm is None:
            height_cm = (data.get("height_weight") or {}).get("height_cm")

        weight_kg = data.get("weight_kg")
        if weight_kg is None:
            weight_kg = (data.get("height_weight") or {}).get("weight_kg") or data.get("weight")

        temperature = data.get("temperature")
        if isinstance(temperature, dict):
            temperature = temperature.get("value")

        pulse = data.get("pulse") or data.get("heart_rate")
        spo2 = data.get("spo2") or data.get("oxygen_saturation")

        bp_str = f"{sys_v}/{dia_v}" if sys_v and dia_v else None

        return sanitize_audit_payload(
            {
                "height_cm": height_cm,
                "weight_kg": weight_kg,
                "temperature": temperature,
                "pulse": pulse,
                "blood_pressure": bp_str,
                "spo2": spo2,
            }
        )

    @staticmethod
    def build_symptoms_recorded(
        *,
        symptom_row=None,
        chief_complaint: str | None = None,
        symptom_names: list[str] | None = None,
    ) -> dict[str, Any]:
        names = list(symptom_names or [])
        if symptom_row is not None:
            name = getattr(symptom_row, "display_name", None)
            if name and name not in names:
                names.append(name)

        duration = None
        if symptom_row is not None:
            duration_value = getattr(symptom_row, "duration_value", None)
            duration_unit = getattr(symptom_row, "duration_unit", None)
            if duration_value is not None and duration_unit:
                duration = f"{duration_value} {duration_unit}"
            else:
                extra = getattr(symptom_row, "extra_data", None) or {}
                if isinstance(extra, dict):
                    duration = extra.get("duration") or extra.get("duration_text")

        return sanitize_audit_payload(
            {
                "chief_complaint": chief_complaint,
                "symptoms": names,
                "duration": duration,
            }
        )

    @staticmethod
    def diagnosis_state_from_row(diagnosis_row) -> dict[str, Any]:
        code = getattr(diagnosis_row, "icd_code", None)
        if not code and getattr(diagnosis_row, "master", None) is not None:
            code = getattr(diagnosis_row.master, "icd10_code", None)
        return {
            "diagnosis_code": code,
            "diagnosis_name": (
                getattr(diagnosis_row, "display_name", None)
                or getattr(diagnosis_row, "label", None)
            ),
            "classification": getattr(diagnosis_row, "diagnosis_type", None),
            "is_primary": bool(getattr(diagnosis_row, "is_primary", False)),
            "severity": getattr(diagnosis_row, "severity", None),
            "doctor_note": getattr(diagnosis_row, "doctor_note", None),
            "is_chronic": bool(getattr(diagnosis_row, "is_chronic", False)),
        }

    @staticmethod
    def diff_diagnosis_fields(
        prior: dict[str, Any] | None,
        diagnosis_row,
    ) -> list[str]:
        from clinical_documentation.audit.constants import DIAGNOSIS_TRACKED_FIELDS

        current = ClinicalDocumentationPayloadBuilder.diagnosis_state_from_row(
            diagnosis_row
        )
        prior = prior or {}
        changed: list[str] = []
        field_map = {
            "diagnosis_type": "classification",
            "display_name": "diagnosis_name",
            "icd_code": "diagnosis_code",
        }
        for field in DIAGNOSIS_TRACKED_FIELDS:
            snapshot_key = field_map.get(field, field)
            if prior.get(snapshot_key) != current.get(snapshot_key):
                public_name = field_map.get(field, field)
                if public_name == "classification":
                    changed.append("classification")
                elif public_name == "diagnosis_name":
                    changed.append("diagnosis_name")
                elif public_name == "diagnosis_code":
                    changed.append("diagnosis_code")
                else:
                    changed.append(field)
        return changed

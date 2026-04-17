"""
Consultation-specific API views.

This module owns consultation section endpoints (findings/diagnosis/etc. persistence
at end consultation), separated from pre-consultation views for clearer boundaries.
"""

import logging
import json

from django.conf import settings
from django.http import HttpResponse
from django.template.loader import render_to_string
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from account.permissions import IsDoctor
from consultations_core.api.views.preconsultation import (
    EndConsultationAPIView as _EndConsultationAPIView,
)
from consultations_core.models.consultation import Consultation
from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.services.consultation_summary_service import (
    build_consultation_summary,
    build_numeric_dose_display,
)

logger = logging.getLogger(__name__)
def _as_list(value):
    return value if isinstance(value, list) else []


def _as_dict(value):
    return value if isinstance(value, dict) else {}


def _format_duration(value, unit):
    if value in (None, ""):
        return ""
    if unit in (None, ""):
        return str(value)
    return f"{value} {unit}"


def _extract_payload_sections(payload):
    store = _as_dict(payload.get("store")) if isinstance(payload, dict) else {}
    section_items = _as_dict(store.get("sectionItems"))
    meta = _as_dict(store.get("meta"))
    return section_items, meta


def _draft_diagnoses(payload):
    section_items, _ = _extract_payload_sections(payload)
    rows = []
    for item in _as_list(section_items.get("diagnosis")):
        if not isinstance(item, dict):
            continue
        detail = _as_dict(item.get("detail"))
        name = (
            item.get("diagnosis_label")
            or item.get("label")
            or item.get("diagnosis_key")
            or item.get("diagnosis_icd_code")
            or item.get("custom_name")
            or ""
        )
        name = str(name).strip()
        if not name:
            continue
        rows.append(
            {
                "name": name,
                "type": "primary" if item.get("is_primary") else "secondary",
                "notes": str(item.get("doctor_note") or detail.get("notes") or "").strip(),
            }
        )
    return rows


def _draft_prescriptions(payload):
    section_items, _ = _extract_payload_sections(payload)
    rows = []
    for item in _as_list(section_items.get("medicines")):
        if not isinstance(item, dict):
            continue
        detail = _as_dict(item.get("detail"))
        med = _as_dict(detail.get("medicine"))
        name = med.get("name") or item.get("name") or item.get("label") or ""
        name = str(name).strip()
        if not name:
            continue
        dose_value = "" if med.get("dose_value") in (None, "") else str(med.get("dose_value")).strip()
        dose_unit = str(med.get("dose_unit") or med.get("dose_unit_name") or "").strip()
        med_type = str(med.get("drug_type") or med.get("dose_type") or item.get("type") or "").strip()
        if not med_type:
            name_l = name.lower()
            if "inject" in name_l:
                med_type = "injection"
            elif "cream" in name_l:
                med_type = "cream"
            elif "ointment" in name_l:
                med_type = "ointment"
            elif "capsule" in name_l:
                med_type = "capsule"
            elif "tablet" in name_l:
                med_type = "tablet"
            elif "syrup" in name_l:
                med_type = "syrup"
            elif "inhaler" in name_l or "puff" in name_l:
                med_type = "inhaler"
            elif "drop" in name_l:
                med_type = "drops"
        frequency_display = str(med.get("frequency_display") or med.get("frequency_label") or med.get("frequency_id") or "").strip()
        frequency_code = str(med.get("frequency_code") or "").strip()
        route_display = str(med.get("route_display") or med.get("route_label") or "").strip()
        route_id = str(med.get("route_id") or "").strip().lower()
        if not route_display:
            route_id_map = {
                "iv": "IV",
                "intravenous": "IV",
                "im": "IM",
                "intramuscular": "IM",
                "sc": "SC",
                "subcutaneous": "SC",
            }
            route_display = route_id_map.get(route_id, route_id)
        route_code = str(med.get("route_code") or "").strip()
        duration_value = med.get("duration_value")
        duration_unit = med.get("duration_unit")
        instructions = med.get("instructions") or item.get("instructions") or ""
        display = build_numeric_dose_display(
            dose_value=dose_value,
            dose_unit=dose_unit,
            medicine_type=med_type,
            frequency_display=frequency_display,
            frequency_code=frequency_code,
            route_display=route_display,
            route_code=route_code,
            instructions=instructions,
            is_prn=bool(med.get("is_prn")),
            is_stat=bool(med.get("is_stat")),
            timing_pattern=str(med.get("timing_pattern") or med.get("dose_pattern") or "").strip(),
            drug_name=name,
        )
        rows.append(
            {
                "drug_name": name,
                "dosage_display": display["legacy_dose_display"],
                "dose_display_numeric": display["dose_display_numeric"],
                "timing_pattern": display["timing_pattern"],
                "frequency_display": frequency_display,
                "duration_display": _format_duration(duration_value, duration_unit),
                "route": route_display,
                "instructions": display["normalized_instructions"],
                "medicine_type": med_type,
                "dose_unit": dose_unit,
            }
        )
    return rows


def _draft_investigations(payload):
    section_items, _ = _extract_payload_sections(payload)
    rows = []
    for item in _as_list(section_items.get("investigations")):
        if not isinstance(item, dict):
            continue
        detail = _as_dict(item.get("detail"))
        name = item.get("name") or item.get("label") or detail.get("name") or ""
        name = str(name).strip()
        if not name:
            continue
        rows.append(
            {
                "name": name,
                "type": str(item.get("type") or detail.get("custom_investigation_type") or "").strip(),
                "notes": str(item.get("notes") or detail.get("notes") or "").strip(),
            }
        )
    return rows


def _draft_instructions(payload):
    section_items, _ = _extract_payload_sections(payload)
    instructions = section_items.get("instructions")
    rows = []
    if isinstance(instructions, dict):
        for item in _as_list(instructions.get("template_instructions")):
            if not isinstance(item, dict):
                continue
            text = str(item.get("label") or item.get("text") or "").strip()
            if text:
                rows.append({"category": "advice", "text": text})
        for item in _as_list(instructions.get("custom_instructions")):
            if not isinstance(item, dict):
                continue
            text = str(item.get("label") or item.get("text") or "").strip()
            if text:
                rows.append({"category": "advice", "text": text})
        return rows
    for item in _as_list(instructions):
        if not isinstance(item, dict):
            continue
        text = str(item.get("label") or item.get("text") or item.get("custom_note") or "").strip()
        if text:
            rows.append({"category": "advice", "text": text})
    return rows


def _draft_vitals(payload):
    """Map UI store.vitals (camelCase) onto summary vitals keys used by prescription.html."""
    store = _as_dict(payload.get("store")) if isinstance(payload, dict) else {}
    raw = store.get("vitals")
    if not isinstance(raw, dict):
        return None
    height_cm = str(raw.get("heightCm") or raw.get("height_cm") or "").strip()
    weight_kg = str(raw.get("weightKg") or raw.get("weight_kg") or "").strip()
    temperature = str(raw.get("temperatureF") or raw.get("temperature") or "").strip()
    raw_bp = raw.get("bp")
    if isinstance(raw_bp, dict):
        sys = str(raw_bp.get("systolic") or "").strip()
        dia = str(raw_bp.get("diastolic") or "").strip()
        bp = f"{sys}/{dia}" if sys and dia else (sys or dia)
    else:
        bp = str(raw_bp or "").strip()
    pulse = str(raw.get("pulse") or "").strip()
    out = {}
    if height_cm:
        out["height_cm"] = height_cm
    if weight_kg:
        out["weight_kg"] = weight_kg
    if temperature:
        out["temperature"] = temperature
    if bp:
        out["bp"] = bp
    if pulse:
        out["pulse"] = pulse
    return out or None


def _draft_follow_up(payload):
    _, meta = _extract_payload_sections(payload)
    follow_up = _as_dict(meta.get("follow_up"))
    date_value = str(follow_up.get("date") or "").strip()
    interval = follow_up.get("interval")
    unit = str(follow_up.get("unit") or "").strip()
    reason = str(follow_up.get("reason") or "").strip()
    if not date_value and not interval and not reason:
        return None
    date_display = date_value
    if date_value:
        try:
            from datetime import date

            parsed = date.fromisoformat(date_value.split("T", 1)[0])
            date_display = parsed.strftime("%d %b %Y")
        except Exception:
            date_display = date_value
    elif interval:
        date_display = f"After {interval} {unit or 'days'}"
    return {"date": date_value or None, "date_display": date_display or "As advised", "notes": reason, "type": "routine"}


def _apply_draft_preview_overrides(summary, payload):
    if not isinstance(summary, dict) or not isinstance(payload, dict):
        return summary

    merged = dict(summary)
    diagnoses = _draft_diagnoses(payload)
    prescriptions = _draft_prescriptions(payload)
    investigations = _draft_investigations(payload)
    instructions = _draft_instructions(payload)
    follow_up = _draft_follow_up(payload)
    draft_vitals = _draft_vitals(payload)

    if diagnoses:
        merged["diagnoses"] = diagnoses
    if prescriptions:
        merged["prescriptions"] = prescriptions
    if investigations:
        merged["investigations"] = investigations
    if instructions:
        merged["instructions"] = instructions
    if follow_up:
        merged["follow_up"] = follow_up
    if draft_vitals:
        base_vitals = _as_dict(merged.get("vitals"))
        merged["vitals"] = {**base_vitals, **draft_vitals}
    return merged


class EndConsultationAPIView(_EndConsultationAPIView):
    """Consultation completion endpoint (consultation section persistence)."""

    def post(self, request, encounter_id):
        response = super().post(request, encounter_id)
        if response.status_code != status.HTTP_200_OK:
            return response

        include_summary = str(request.query_params.get("include_summary", "")).lower() in {"1", "true", "yes"}
        if not include_summary:
            return response

        encounter = ClinicalEncounter.objects.select_related("consultation").filter(id=encounter_id).first()
        if encounter is None or not hasattr(encounter, "consultation"):
            return response

        summary = build_consultation_summary(consultation_id=encounter.consultation.id, profile="full")
        response.data["summary"] = summary
        return response


class _BaseConsultationSummaryAPIView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]
    summary_profile = "full"

    def get(self, request, consultation_id):
        sections = request.query_params.getlist("sections")
        try:
            payload = build_consultation_summary(
                consultation_id=consultation_id,
                sections=sections or None,
                profile=self.summary_profile,
            )
        except Consultation.DoesNotExist:
            return Response({"detail": "Consultation not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(payload, status=status.HTTP_200_OK)


class ConsultationSummaryAPIView(_BaseConsultationSummaryAPIView):
    summary_profile = "full"


class ConsultationSummaryLiteAPIView(_BaseConsultationSummaryAPIView):
    summary_profile = "preview_pdf"


class ConsultationSummaryLiteHTMLAPIView(_BaseConsultationSummaryAPIView):
    summary_profile = "preview_pdf"

    def _render_preview(self, request, consultation_id, draft_payload=None):
        sections = request.query_params.getlist("sections")
        try:
            summary = build_consultation_summary(
                consultation_id=consultation_id,
                sections=sections or None,
                profile=self.summary_profile,
            )
        except Consultation.DoesNotExist:
            return Response({"detail": "Consultation not found."}, status=status.HTTP_404_NOT_FOUND)

        if not summary:
            raise NotFound("Consultation not found.")

        if isinstance(draft_payload, dict):
            summary = _apply_draft_preview_overrides(summary, draft_payload)

        html = render_to_string("prescriptions/prescription.html", summary)
        html = html.strip()

        include_summary = settings.DEBUG and (
            str(request.query_params.get("include_summary", "")).lower() in {"1", "true", "yes"}
        )
        payload = {"html": html}
        if include_summary:
            payload["summary"] = summary
        return Response(payload, status=status.HTTP_200_OK, content_type="application/json")

    def get(self, request, consultation_id):
        return self._render_preview(request=request, consultation_id=consultation_id)

    def post(self, request, consultation_id):
        draft_payload = request.data if isinstance(request.data, dict) else {}
        return self._render_preview(
            request=request,
            consultation_id=consultation_id,
            draft_payload=draft_payload,
        )


class ConsultationSummaryLitePDFAPIView(ConsultationSummaryLiteHTMLAPIView):
    summary_profile = "preview_pdf"

    def _render_pdf(self, request, consultation_id, draft_payload=None):
        sections = request.query_params.getlist("sections")
        try:
            summary = build_consultation_summary(
                consultation_id=consultation_id,
                sections=sections or None,
                profile=self.summary_profile,
            )
        except Consultation.DoesNotExist:
            return Response({"detail": "Consultation not found."}, status=status.HTTP_404_NOT_FOUND)

        if not summary:
            raise NotFound("Consultation not found.")

        if isinstance(draft_payload, dict):
            summary = _apply_draft_preview_overrides(summary, draft_payload)

        html = render_to_string("prescriptions/prescription.html", summary).strip()
        base_url = request.build_absolute_uri("/")
        try:
            from weasyprint import HTML

            pdf_binary = HTML(string=html, base_url=base_url).write_pdf()
        except Exception as exc:
            logger.exception("Failed to generate prescription PDF for consultation %s", consultation_id)
            return Response(
                {
                    "detail": "PDF generation failed. Ensure WeasyPrint and system dependencies are installed.",
                    "error": str(exc),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        response = HttpResponse(pdf_binary, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="prescription-{consultation_id}.pdf"'
        return response

    def get(self, request, consultation_id):
        return self._render_pdf(request=request, consultation_id=consultation_id)

    def post(self, request, consultation_id):
        draft_payload = request.data if isinstance(request.data, dict) else {}
        return self._render_pdf(
            request=request,
            consultation_id=consultation_id,
            draft_payload=draft_payload,
        )

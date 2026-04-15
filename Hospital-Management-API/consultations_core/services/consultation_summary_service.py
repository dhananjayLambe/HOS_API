from __future__ import annotations

from datetime import date, datetime
import logging
import re
from typing import Any, Iterable

from django.conf import settings
from django.core.cache import cache
from django.db.models import Prefetch
from django.utils import timezone

from consultations_core.models.consultation import Consultation
from consultations_core.models.diagnosis import ConsultationDiagnosis
from consultations_core.models.findings import ConsultationFinding
from consultations_core.models.follow_up import FollowUp
from consultations_core.models.instruction import EncounterInstruction
from consultations_core.models.investigation import InvestigationItem
from consultations_core.models.prescription import Prescription
from consultations_core.models.prescription import PrescriptionLine
from consultations_core.models.symptoms import ConsultationSymptom

logger = logging.getLogger(__name__)

FULL_SECTIONS = (
    "symptoms",
    "findings",
    "diagnoses",
    "prescriptions",
    "instructions",
    "investigations",
    "procedures",
    "follow_up",
)

PREVIEW_PDF_SECTIONS = (
    "diagnoses",
    "prescriptions",
    "instructions",
    "investigations",
    "follow_up",
)


def build_consultation_summary(consultation_id, sections: Iterable[str] | None = None, profile: str = "full") -> dict[str, Any]:
    selected_sections = _resolve_sections(sections=sections, profile=profile)
    cache_key = _summary_cache_key(consultation_id=consultation_id, sections=selected_sections, profile=profile)

    if _is_cache_enabled():
        cached = cache.get(cache_key)
        if isinstance(cached, dict):
            return cached

    consultation = _get_consultation_with_relations(consultation_id=consultation_id, sections=selected_sections)
    summary = _compose_summary(consultation=consultation, sections=selected_sections, profile=profile)

    if _is_cache_enabled() and summary.get("meta", {}).get("status") == "completed":
        ttl_seconds = int(getattr(settings, "CONSULTATION_SUMMARY_CACHE_TTL_SECONDS", 900))
        cache.set(cache_key, summary, ttl_seconds)
    return summary


def _resolve_sections(sections: Iterable[str] | None, profile: str) -> set[str]:
    valid = set(FULL_SECTIONS)
    if sections:
        return {section for section in sections if section in valid}
    if profile == "preview_pdf":
        return set(PREVIEW_PDF_SECTIONS)
    return set(FULL_SECTIONS)


def _is_cache_enabled() -> bool:
    return bool(getattr(settings, "ENABLE_CONSULTATION_SUMMARY_CACHE", False))


def _summary_cache_key(consultation_id, sections: set[str], profile: str) -> str:
    sections_key = ",".join(sorted(sections))
    return f"consultation_summary:{consultation_id}:v1:{profile}:{sections_key}"


def _get_consultation_with_relations(consultation_id, sections: set[str]) -> Consultation:
    queryset = Consultation.objects.select_related(
        "encounter",
        "encounter__doctor",
        "encounter__doctor__user",
        "encounter__doctor__registration",
        "encounter__clinic",
        "encounter__clinic__address",
        "encounter__patient_account",
        "encounter__patient_account__user",
        "encounter__patient_profile",
        "encounter__appointment",
        "encounter__pre_consultation",
    ).only(
        "id",
        "created_at",
        "ended_at",
        "is_finalized",
        "follow_up_date",
        "closure_note",
        "encounter__id",
        "encounter__status",
        "encounter__encounter_type",
        "encounter__check_in_time",
        "encounter__created_at",
        "encounter__consultation_end_time",
        "encounter__doctor",
        "encounter__doctor__id",
        "encounter__doctor__secondary_mobile_number",
        "encounter__doctor__title",
        "encounter__doctor__primary_specialization",
        "encounter__doctor__user_id",
        "encounter__doctor__registration__id",
        "encounter__doctor__registration__medical_registration_number",
        "encounter__doctor__user__first_name",
        "encounter__doctor__user__last_name",
        "encounter__doctor__user__username",
        "encounter__clinic",
        "encounter__clinic__id",
        "encounter__clinic__name",
        "encounter__clinic__contact_number_primary",
        "encounter__clinic__contact_number_secondary",
        "encounter__clinic__email_address",
        "encounter__clinic__address__address",
        "encounter__clinic__address__address2",
        "encounter__clinic__address__city",
        "encounter__clinic__address__state",
        "encounter__clinic__address__pincode",
        "encounter__patient_account",
        "encounter__patient_profile",
        "encounter__appointment",
    ).prefetch_related(
        "encounter__pre_consultation__preconsultationvitals",
        "encounter__pre_consultation__preconsultationchiefcomplaint",
    )

    prefetches = []
    if "symptoms" in sections:
        prefetches.append(
            Prefetch(
                "symptoms",
                queryset=ConsultationSymptom.objects.filter(is_active=True).select_related(
                    "symptom",
                    "custom_symptom",
                    "extension",
                ),
            )
        )
    if "findings" in sections:
        prefetches.append(
            Prefetch(
                "findings",
                queryset=ConsultationFinding.objects.filter(is_active=True).select_related("finding", "custom_finding"),
            )
        )
    if "diagnoses" in sections:
        prefetches.append(
            Prefetch(
                "diagnoses",
                queryset=ConsultationDiagnosis.objects.filter(is_active=True).select_related("master", "custom_diagnosis"),
            )
        )
    if "prescriptions" in sections:
        prefetches.append(
            Prefetch(
                "prescriptions",
                queryset=Prescription.objects.filter(is_active=True)
                .only("id", "consultation_id", "is_active", "created_at")
                .order_by("-created_at"),
            )
        )
        prefetches.append(
            Prefetch(
                "prescriptions__lines",
                queryset=PrescriptionLine.objects.filter(deleted_at__isnull=True).select_related(
                    "frequency",
                    "route",
                    "dose_unit",
                    "drug",
                    "custom_medicine",
                ).only(
                    "id",
                    "prescription_id",
                    "drug_name_snapshot",
                    "formulation_snapshot",
                    "dose_value",
                    "duration_value",
                    "duration_unit",
                    "instructions",
                    "is_prn",
                    "is_stat",
                    "dose_unit__name",
                    "frequency__display_name",
                    "frequency__code",
                    "route__name",
                    "route__code",
                    "drug__drug_type",
                    "custom_medicine__dose_type",
                ),
            )
        )
    if "instructions" in sections:
        prefetches.append(
            Prefetch(
                "encounter__instructions",
                queryset=EncounterInstruction.objects.filter(is_active=True).select_related(
                    "instruction_template__category"
                ),
            )
        )
    if "investigations" in sections:
        prefetches.append(
            Prefetch(
                "investigations__items",
                queryset=InvestigationItem.objects.filter(
                    is_deleted=False,
                    investigations__is_active=True,
                ).order_by("position", "-created_at"),
            )
        )
    if "procedures" in sections:
        prefetches.append("procedures")
    if "follow_up" in sections:
        prefetches.append("follow_ups")

    if prefetches:
        queryset = queryset.prefetch_related(*prefetches)
    return queryset.get(id=consultation_id)


def _compose_summary(consultation: Consultation, sections: set[str], profile: str) -> dict[str, Any]:
    encounter = consultation.encounter
    pre_consultation = getattr(encounter, "pre_consultation", None)
    now = timezone.now()

    summary = {
        "meta": {
            "consultation_id": str(consultation.id),
            "encounter_id": str(encounter.id),
            "status": _normalize_status(encounter_status=encounter.status, consultation=consultation),
            "created_at": _iso_datetime(consultation.created_at),
            "completed_at": _iso_datetime(consultation.ended_at or encounter.consultation_end_time),
            "version": "v1",
            "generated_at": _iso_datetime(now),
            "generated_by": "summary_service",
            "profile": profile,
        },
        "clinic": _build_clinic(encounter),
        "doctor": _build_doctor(encounter),
        "patient": _build_patient(encounter),
        "visit": _build_visit(encounter),
        "vitals": _build_vitals(consultation=consultation, pre_consultation=pre_consultation),
        "symptoms": _build_symptoms(consultation, pre_consultation) if "symptoms" in sections else [],
        "findings": _build_findings(consultation) if "findings" in sections else [],
        "diagnoses": _build_diagnoses(consultation) if "diagnoses" in sections else [],
        "prescriptions": _build_prescriptions(consultation) if "prescriptions" in sections else [],
        "instructions": _build_instructions(encounter) if "instructions" in sections else [],
        "investigations": _build_investigations(consultation) if "investigations" in sections else [],
        "procedures": _build_procedures(consultation) if "procedures" in sections else [],
        "follow_up": _build_follow_up(consultation) if "follow_up" in sections else {"date": None, "notes": "", "type": ""},
    }
    return summary


def _build_clinic(encounter) -> dict[str, Any]:
    clinic = encounter.clinic
    primary = _strip_na_value(getattr(clinic, "contact_number_primary", None))
    secondary = _strip_na_value(getattr(clinic, "contact_number_secondary", None))
    contact = primary or secondary
    email = _strip_na_value(getattr(clinic, "email_address", None))
    return {
        "name": _first_non_empty(clinic, ("name", "clinic_name")),
        "address": _format_clinic_address(clinic) or _first_non_empty(clinic, ("address", "address_line1")),
        "contact": contact,
        "email": email,
    }


def _build_doctor(encounter) -> dict[str, Any]:
    doctor = encounter.doctor
    user = getattr(doctor, "user", None)
    reg_no = ""
    try:
        registration = doctor.registration
    except Exception:
        registration = None
    if registration is not None:
        reg_no = _strip_na_value(getattr(registration, "medical_registration_number", None))
    mobile = _strip_na_value(getattr(doctor, "secondary_mobile_number", None))
    if not mobile and user is not None:
        mobile = _strip_na_value(getattr(user, "username", None)) if _looks_like_phone(getattr(user, "username", None)) else ""
    qualification = _first_non_empty(doctor, ("title",)) or _first_non_empty(doctor, ("primary_specialization",))
    return {
        "full_name": _display_name(primary=doctor, fallback=user),
        "qualification": qualification,
        "registration_number": reg_no,
        "mobile": mobile,
    }


def _build_patient(encounter) -> dict[str, Any]:
    profile = encounter.patient_profile
    account = encounter.patient_account
    user = getattr(account, "user", None)
    return {
        "full_name": _display_name(primary=profile, fallback=user),
        "age_display": _build_age_display(profile),
        "gender": _first_non_empty(profile, ("gender", "sex")),
        "mobile": _first_non_empty(account, ("mobile", "phone")) or _first_non_empty(user, ("mobile", "phone")),
    }


def _build_visit(encounter) -> dict[str, Any]:
    visit_date = (encounter.check_in_time or encounter.created_at)
    visit_date_value = visit_date.date() if isinstance(visit_date, datetime) else None
    return {
        "date": _iso_date(visit_date_value),
        "date_display": _display_date(visit_date_value),
        "time_display": _display_time(visit_date),
        "type": "IPD" if str(getattr(encounter, "encounter_type", "")).lower() == "ipd" else "OPD",
        "token_number": _first_non_empty(getattr(encounter, "appointment", None), ("token_number", "token", "queue_number")),
        "visit_reason": _first_non_empty(getattr(encounter, "appointment", None), ("reason", "visit_reason")),
    }


def _build_vitals(consultation: Consultation, pre_consultation) -> dict[str, Any]:
    data = {}
    if pre_consultation is not None:
        vitals = getattr(pre_consultation, "preconsultationvitals", None)
        data = (getattr(vitals, "data", None) or {}) if vitals else {}
    bp_value = data.get("bp") or data.get("blood_pressure", "")
    if isinstance(bp_value, dict):
        systolic = str(bp_value.get("systolic") or "").strip()
        diastolic = str(bp_value.get("diastolic") or "").strip()
        if systolic and diastolic:
            bp_value = f"{systolic}/{diastolic}"
        else:
            bp_value = systolic or diastolic or ""
    elif bp_value is None:
        bp_value = ""
    pulse_value = data.get("pulse", "")
    if isinstance(pulse_value, dict):
        pulse_value = pulse_value.get("pulse_rate") or pulse_value.get("value") or ""
    elif pulse_value is None:
        pulse_value = ""

    temperature_value = data.get("temperature")
    temperature_unit = "C"
    if isinstance(temperature_value, dict):
        temperature_unit = str(temperature_value.get("unit") or temperature_value.get("uom") or "C").strip() or "C"
        temperature_value = temperature_value.get("value") or ""
    elif temperature_value is None:
        temperature_value = ""

    return {
        "height_cm": (
            data.get("height_cm")
            or data.get("height")
            or _get_nested(data, ("height_weight", "height_cm"))
            or _get_nested(data, ("height_weight", "height"))
            or ""
        ),
        "weight_kg": (
            data.get("weight_kg")
            or data.get("weight")
            or _get_nested(data, ("height_weight", "weight_kg"))
            or _get_nested(data, ("height_weight", "weight"))
            or ""
        ),
        "bp": bp_value,
        "pulse": pulse_value,
        "temperature": temperature_value,
        "temperature_unit": temperature_unit,
    }


def _build_symptoms(consultation: Consultation, pre_consultation) -> list[dict[str, Any]]:
    symptoms = [
        {
            "name": symptom.display_name or "",
            "duration": _duration_display(symptom.duration_value, symptom.duration_unit),
            "severity": symptom.severity or "",
            "notes": "",
        }
        for symptom in consultation.symptoms.all()
    ]
    if symptoms:
        return symptoms
    complaint_data = {}
    if pre_consultation is not None:
        complaint = getattr(pre_consultation, "preconsultationchiefcomplaint", None)
        complaint_data = (getattr(complaint, "data", None) or {}) if complaint else {}
    complaint_texts = _extract_texts(complaint_data)
    return [{"name": text, "duration": "", "severity": "", "notes": ""} for text in complaint_texts]


def _build_findings(consultation: Consultation) -> list[dict[str, Any]]:
    return [{"name": item.display_name or "", "notes": item.note or ""} for item in consultation.findings.all()]


def _build_diagnoses(consultation: Consultation) -> list[dict[str, Any]]:
    rows = []
    seen_names: set[str] = set()
    for item in consultation.diagnoses.all():
        name = (item.display_name or item.label or "").strip()
        if not name:
            continue
        key = name.lower()
        if key in seen_names:
            continue
        seen_names.add(key)
        diagnosis_type = "primary" if item.is_primary else "secondary"
        rows.append({"name": name, "type": diagnosis_type, "notes": item.doctor_note or ""})
    return rows


def _build_prescriptions(consultation: Consultation) -> list[dict[str, Any]]:
    active = next((item for item in consultation.prescriptions.all() if item.is_active), None)
    if not active:
        return []
    rows = []
    for line in active.lines.all():
        dose_value = _format_decimal(line.dose_value)
        dose_unit = _first_non_empty(getattr(line, "dose_unit", None), ("name", "label", "code"))
        frequency_display = _first_non_empty(line.frequency, ("display_name", "name", "label", "code"))
        frequency_code = _first_non_empty(line.frequency, ("code",))
        route_display = _first_non_empty(line.route, ("name", "label", "code"))
        route_code = _first_non_empty(line.route, ("code",))
        medicine_type = (
            _first_non_empty(getattr(line, "drug", None), ("drug_type",))
            or _first_non_empty(getattr(line, "custom_medicine", None), ("dose_type",))
            or line.formulation_snapshot
        )
        display = build_numeric_dose_display(
            dose_value=dose_value,
            dose_unit=dose_unit,
            medicine_type=medicine_type,
            frequency_display=frequency_display,
            frequency_code=frequency_code,
            route_display=route_display,
            route_code=route_code,
            instructions=line.instructions,
            is_prn=bool(line.is_prn),
            is_stat=bool(line.is_stat),
            drug_name=line.drug_name_snapshot or "",
        )
        rows.append(
            {
                "drug_name": line.drug_name_snapshot or "",
                "dosage_display": display["legacy_dose_display"],
                "dose_display_numeric": display["dose_display_numeric"],
                "timing_pattern": display["timing_pattern"],
                "frequency_display": frequency_display,
                "duration_display": _duration_display(line.duration_value, line.duration_unit),
                "route": route_display,
                "instructions": display["normalized_instructions"],
                "medicine_type": str(medicine_type or "").strip(),
                "dose_unit": dose_unit,
            }
        )
    return rows


def _build_instructions(encounter) -> list[dict[str, Any]]:
    rows = []
    for instruction in encounter.instructions.all():
        rows.append(
            {
                "category": _instruction_category(instruction),
                "text": instruction.text_snapshot or instruction.custom_note or "",
            }
        )
    return rows


def _build_investigations(consultation: Consultation) -> list[dict[str, Any]]:
    investigations = getattr(consultation, "investigations", None)
    if not investigations:
        return []
    rows = []
    for item in investigations.items.all():
        rows.append({"name": item.name or "", "type": item.investigation_type or "", "notes": item.notes or ""})
    return rows


def _build_procedures(consultation: Consultation) -> list[dict[str, Any]]:
    return [{"name": "", "notes": item.notes or ""} for item in consultation.procedures.all()]


def _build_follow_up(consultation: Consultation) -> dict[str, Any]:
    follow_up = consultation.follow_ups.order_by("-created_at").first()
    fallback_date = consultation.follow_up_date
    if follow_up:
        date_value = follow_up.follow_up_date
        notes = follow_up.condition_note or consultation.closure_note or ""
        follow_up_type = _follow_up_type_to_contract(follow_up.follow_up_type)
        if fallback_date and date_value and fallback_date != date_value:
            logger.warning(
                "Consultation %s follow-up date mismatch: follow_up=%s consultation=%s",
                consultation.id,
                date_value,
                fallback_date,
            )
    else:
        date_value = fallback_date
        notes = consultation.closure_note or ""
        follow_up_type = "routine"
    return {
        "date": _iso_date(date_value),
        "date_display": _display_date(date_value) or "As advised",
        "notes": notes,
        "type": follow_up_type,
    }


def _normalize_status(encounter_status: str, consultation: Consultation) -> str:
    if consultation.is_finalized:
        return "completed"
    if encounter_status in ("consultation_in_progress", "in_consultation"):
        return "in_progress"
    return "draft"


def _instruction_category(instruction) -> str:
    template = getattr(instruction, "instruction_template", None)
    category = getattr(template, "category", None)
    category_code = _first_non_empty(category, ("code", "name"))
    category_code = str(category_code).strip().lower()
    if category_code in {"diet", "lifestyle", "advice"}:
        return category_code
    return "advice"


def _follow_up_type_to_contract(follow_up_type: str) -> str:
    if follow_up_type in (FollowUp.FollowUpType.ASAP, FollowUp.FollowUpType.CONDITIONAL):
        return "urgent"
    return "routine"


def _build_age_display(profile) -> str:
    age_value = getattr(profile, "age", None)
    if isinstance(age_value, int):
        return f"{age_value}y"
    dob = getattr(profile, "date_of_birth", None) or getattr(profile, "dob", None)
    if not dob:
        return ""
    today = timezone.now().date()
    years = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    return f"{years}y" if years >= 0 else ""


def _duration_display(value, unit) -> str:
    if not value:
        return ""
    if not unit:
        return str(value)
    return f"{value} {unit}"


def _extract_texts(data: Any) -> list[str]:
    if isinstance(data, str):
        text = data.strip()
        return [text] if text else []
    if isinstance(data, list):
        texts = []
        for item in data:
            texts.extend(_extract_texts(item))
        return texts
    if isinstance(data, dict):
        texts = []
        for value in data.values():
            texts.extend(_extract_texts(value))
        seen = []
        for item in texts:
            if item not in seen:
                seen.append(item)
        return seen
    return []


def _get_nested(payload: dict[str, Any], path: tuple[str, str]) -> Any:
    current = payload
    for key in path:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    return current


def _first_non_empty(obj: Any, attrs: tuple[str, ...]) -> str:
    if obj is None:
        return ""
    for attr in attrs:
        value = getattr(obj, attr, None)
        if value is None:
            continue
        text = str(value).strip()
        if text:
            return text
    return ""


def _strip_na_value(value: Any) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    if not text or text.upper() == "NA":
        return ""
    return text


def _looks_like_phone(value: Any) -> bool:
    if value is None:
        return False
    digits = "".join(c for c in str(value) if c.isdigit())
    return len(digits) >= 10


def _format_clinic_address(clinic) -> str:
    if clinic is None:
        return ""
    try:
        addr = clinic.address
    except Exception:
        return ""
    parts = []
    for field in ("address", "address2", "city", "state", "pincode"):
        chunk = _strip_na_value(getattr(addr, field, None))
        if chunk:
            parts.append(chunk)
    return ", ".join(parts)


def _display_name(primary: Any, fallback: Any) -> str:
    for obj in (primary, fallback):
        if obj is None:
            continue
        get_full_name = getattr(obj, "get_full_name", None)
        if callable(get_full_name):
            value = (get_full_name() or "").strip()
            if value:
                return value
        value = _first_non_empty(obj, ("full_name", "name", "username"))
        if value:
            return value
    return ""


def _iso_datetime(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def _iso_date(value: date | None) -> str | None:
    return value.isoformat() if value else None


def _display_date(value: date | None) -> str:
    return value.strftime("%d %b %Y") if value else ""


def _display_time(value: datetime | None) -> str:
    if not isinstance(value, datetime):
        return ""
    return timezone.localtime(value).strftime("%I:%M %p").lstrip("0")


def _format_decimal(value: Any) -> str:
    if value is None:
        return ""
    return f"{value}".rstrip("0").rstrip(".") if "." in f"{value}" else f"{value}"


def _timing_slot_max() -> int:
    value = getattr(settings, "PRESCRIPTION_TIMING_SLOT_MAX", 2)
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return 2
    return parsed if parsed > 0 else 2


def _is_valid_timing_pattern(pattern: str) -> bool:
    text = str(pattern or "").strip()
    if not re.fullmatch(r"\d-\d-\d", text):
        return False
    max_slot = _timing_slot_max()
    return all(int(slot) <= max_slot for slot in text.split("-"))


def _derive_timing_pattern(frequency_display: str, frequency_code: str) -> str:
    freq = str(frequency_display or "").strip().lower()
    code = str(frequency_code or "").strip().lower()

    explicit_match = re.search(r"\b\d-\d-\d\b", f"{freq} {code}")
    if explicit_match:
        explicit = explicit_match.group(0)
        if _is_valid_timing_pattern(explicit):
            return explicit

    if code in {"od", "qd"} or "once" in freq:
        return "0-0-1"
    if code in {"bd", "bid"} or "twice" in freq:
        return "1-0-1"
    if code in {"tid", "tds"} or "thrice" in freq or "three" in freq:
        return "1-1-1"
    return "1-0-1"


def _normalize_instruction_text(text: str, is_prn: bool = False, is_stat: bool = False) -> str:
    normalized = str(text or "").strip()
    if normalized:
        replacements = {
            "after food": "After food",
            "before food": "Before food",
            "shake well before use": "Shake well before use",
            "apply externally only": "Apply externally only",
            "sos": "SOS",
            "stat": "STAT",
        }
        for needle, replacement in replacements.items():
            if needle in normalized.lower():
                normalized = replacement if normalized.lower() == needle else normalized
    if is_prn or is_stat:
        return normalized or "Use when required"
    return normalized


def _normalize_injection_route(route_value: str) -> str:
    route = str(route_value or "").strip().lower()
    if not route:
        return ""
    mapping = {
        "iv": "IV",
        "intravenous": "IV",
        "i.v.": "IV",
        "im": "IM",
        "intramuscular": "IM",
        "i.m.": "IM",
        "sc": "SC",
        "subcutaneous": "SC",
        "s.c.": "SC",
    }
    return mapping.get(route, "")


def build_numeric_dose_display(
    *,
    dose_value: str,
    dose_unit: str,
    medicine_type: str,
    frequency_display: str,
    frequency_code: str,
    route_display: str,
    route_code: str,
    instructions: str,
    is_prn: bool = False,
    is_stat: bool = False,
    timing_pattern: str = "",
    drug_name: str = "",
) -> dict[str, str]:
    med_type = str(medicine_type or "").strip().lower()
    med_name = str(drug_name or "").strip().lower()
    type_hint = f"{med_type} {med_name}".strip()
    # Fallback normalization when drug type is missing but formulation snapshot carries the shape.
    if med_type not in {"tablet", "capsule", "syrup", "injection", "drop", "drops", "cream", "ointment", "inhaler"}:
        if "inject" in type_hint:
            med_type = "injection"
        elif "cream" in type_hint:
            med_type = "cream"
        elif "ointment" in type_hint:
            med_type = "ointment"
        elif "capsule" in type_hint:
            med_type = "capsule"
        elif "tablet" in type_hint:
            med_type = "tablet"
        elif "drop" in type_hint:
            med_type = "drops"
        elif "syrup" in type_hint:
            med_type = "syrup"
        elif "inhaler" in type_hint or "puff" in type_hint:
            med_type = "inhaler"
    normalized_instructions = _normalize_instruction_text(instructions, is_prn=is_prn, is_stat=is_stat)
    dose = str(dose_value or "").strip()
    unit = str(dose_unit or "").strip()
    route = str(route_display or route_code or "").strip()
    normalized_injection_route = _normalize_injection_route(route)

    if is_prn or is_stat:
        return {
            "dose_display_numeric": "SOS",
            "timing_pattern": "",
            "legacy_dose_display": "SOS",
            "normalized_instructions": normalized_instructions or "Use when required",
        }

    explicit_pattern = str(timing_pattern or "").strip()
    if explicit_pattern and not _is_valid_timing_pattern(explicit_pattern):
        raise ValueError(f"Invalid timing pattern: {explicit_pattern}")

    pattern = explicit_pattern or _derive_timing_pattern(frequency_display, frequency_code)
    if not _is_valid_timing_pattern(pattern):
        pattern = _derive_timing_pattern(frequency_display, frequency_code)
    if not _is_valid_timing_pattern(pattern):
        raise ValueError(f"Invalid timing pattern: {pattern}")

    if med_type in {"tablet", "capsule"}:
        unit_label = "capsule" if med_type == "capsule" else "tablet"
        dose_display_numeric = f"{dose or '1'} {unit_label} ({pattern})"
    elif med_type == "syrup":
        dose_display_numeric = f"{dose or '5'} ml ({pattern})"
    elif med_type == "injection":
        route_suffix = f" {normalized_injection_route}" if normalized_injection_route else " IV/IM/SC"
        dose_display_numeric = f"{dose or '1'} dose ({pattern}){route_suffix}"
    elif med_type in {"drop", "drops"}:
        site_suffix = ""
        route_l = route.lower()
        if any(site in route_l for site in ("left", "right", "both")):
            site_suffix = f" {route}"
        dose_display_numeric = f"{dose or '2'} drops ({pattern}){site_suffix}"
    elif med_type in {"cream", "ointment"}:
        dose_display_numeric = f"Apply ({pattern})"
    elif med_type == "inhaler":
        dose_display_numeric = f"{dose or '2'} puffs ({pattern})"
    else:
        unit_label = unit or ""
        lead = " ".join(chunk for chunk in [dose, unit_label] if chunk).strip() if unit_label else f"{dose or '1'} dose"
        dose_display_numeric = f"{lead} ({pattern})"

    legacy_display = dose_display_numeric

    return {
        "dose_display_numeric": dose_display_numeric,
        "timing_pattern": pattern,
        "legacy_dose_display": legacy_display,
        "normalized_instructions": normalized_instructions,
    }

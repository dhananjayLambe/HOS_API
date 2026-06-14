"""Presentation helpers for helpdesk clinical visit list and detail rows."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from django.utils import timezone

from consultations_core.domain.encounter_status import encounter_status_for_api
from consultations_core.models.prescription import Prescription, PrescriptionStatus
from consultations_core.services.consultation_summary_service import build_consultation_summary
from diagnostics_engine.api.serializers.reports.report_summary import ReportSummaryListSerializer
from diagnostics_engine.services.reports.report_detail_presenter import build_report_summary_dto
from diagnostics_engine.services.reports.report_query_service import ReportQueryService


VISIT_TYPE_DB_TO_API: dict[str, str] = {
    "walk_in": "WALK_IN",
    "appointment": "APPOINTMENT",
    "follow_up": "FOLLOW_UP",
    "emergency": "EMERGENCY",
}


def visit_type_for_api(encounter_type: str) -> str:
    return VISIT_TYPE_DB_TO_API.get((encounter_type or "").strip().lower(), (encounter_type or "").upper())


def _patient_display_name(profile) -> str:
    if profile is None:
        return ""
    if hasattr(profile, "get_full_name"):
        return (profile.get_full_name() or "").strip()
    parts = [getattr(profile, "first_name", "") or "", getattr(profile, "last_name", "") or ""]
    return " ".join(p for p in parts if p).strip()


def _patient_mobile(profile) -> str:
    if profile is None:
        return ""
    account = getattr(profile, "account", None)
    user = getattr(account, "user", None) if account else None
    return (getattr(user, "username", None) or "").strip()


def _doctor_display_name(encounter) -> str:
    doctor = getattr(encounter, "doctor", None)
    if doctor is None:
        return ""
    if hasattr(doctor, "get_name"):
        return (doctor.get_name or "").strip()
    user = getattr(doctor, "user", None)
    if user:
        parts = [user.first_name or "", user.last_name or ""]
        name = " ".join(p for p in parts if p).strip()
        if name:
            return name
    return "Doctor"


def _started_at(encounter) -> datetime:
    return getattr(encounter, "_started_at", None) or encounter.check_in_time or encounter.created_at


def _active_prescription(consultation):
    if consultation is None:
        return None
    return next(
        (
            item
            for item in consultation.prescriptions.all()
            if item.is_active and item.status == PrescriptionStatus.FINALIZED
        ),
        None,
    )


@dataclass(frozen=True)
class ClinicalVisitListRowDTO:
    visit_id: str
    visit_pnr: str
    started_at: datetime
    patient_name: str
    patient_age: int | None
    patient_gender: str
    patient_mobile: str
    patient_uhid: str
    doctor_name: str
    doctor_id: str | None
    visit_type: str
    status: str
    has_prescription: bool
    prescription_id: str | None
    tests_count: int
    reports_count: int


def build_clinical_visit_list_row_dto(encounter) -> ClinicalVisitListRowDTO:
    profile = encounter.patient_profile
    consultation = getattr(encounter, "consultation", None)
    prescription = _active_prescription(consultation)
    has_rx = bool(getattr(encounter, "has_prescription", False) or prescription)

    return ClinicalVisitListRowDTO(
        visit_id=str(encounter.id),
        visit_pnr=encounter.visit_pnr or "",
        started_at=_started_at(encounter),
        patient_name=_patient_display_name(profile),
        patient_age=getattr(profile, "age", None) if profile else None,
        patient_gender=(getattr(profile, "gender", None) or "").strip() if profile else "",
        patient_mobile=_patient_mobile(profile),
        patient_uhid=(getattr(profile, "public_id", None) or "").strip() if profile else "",
        doctor_name=_doctor_display_name(encounter),
        doctor_id=str(encounter.doctor_id) if encounter.doctor_id else None,
        visit_type=visit_type_for_api(encounter.encounter_type),
        status=encounter_status_for_api(encounter.status),
        has_prescription=has_rx,
        prescription_id=str(prescription.id) if prescription else None,
        tests_count=int(getattr(encounter, "tests_count", 0) or 0),
        reports_count=int(getattr(encounter, "reports_count", 0) or 0),
    )


def list_row_dto_to_representation(row: ClinicalVisitListRowDTO) -> dict:
    return {
        "visit_id": row.visit_id,
        "visit_pnr": row.visit_pnr,
        "started_at": row.started_at.isoformat() if row.started_at else None,
        "patient_name": row.patient_name,
        "patient_age": row.patient_age,
        "patient_gender": row.patient_gender,
        "patient_mobile": row.patient_mobile,
        "patient_uhid": row.patient_uhid,
        "doctor_name": row.doctor_name,
        "doctor_id": row.doctor_id,
        "visit_type": row.visit_type,
        "status": row.status,
        "has_prescription": row.has_prescription,
        "prescription_id": row.prescription_id,
        "tests_count": row.tests_count,
        "reports_count": row.reports_count,
    }


def _duration_minutes(encounter) -> int | None:
    start = encounter.consultation_start_time
    end = encounter.consultation_end_time or encounter.completed_at
    if not start or not end:
        return None
    delta = end - start
    return max(0, int(delta.total_seconds() // 60))


def _symptoms_text(summary: dict) -> list[str]:
    rows = summary.get("symptoms") or []
    result: list[str] = []
    for item in rows:
        if isinstance(item, dict):
            label = (item.get("name") or item.get("symptom") or item.get("label") or "").strip()
            if label:
                result.append(label)
        elif isinstance(item, str) and item.strip():
            result.append(item.strip())
    return result


def _diagnosis_text(summary: dict) -> list[str]:
    rows = summary.get("diagnoses") or []
    result: list[str] = []
    for item in rows:
        if isinstance(item, dict):
            label = (item.get("name") or item.get("diagnosis") or item.get("label") or "").strip()
            if label:
                result.append(label)
        elif isinstance(item, str) and item.strip():
            result.append(item.strip())
    return result


def _advice_text(summary: dict) -> list[str]:
    rows = summary.get("instructions") or []
    result: list[str] = []
    for item in rows:
        if isinstance(item, dict):
            label = (item.get("text") or item.get("instruction") or item.get("content") or "").strip()
            if label:
                result.append(label)
        elif isinstance(item, str) and item.strip():
            result.append(item.strip())
    return result


def _prescription_lines(summary: dict) -> list[dict]:
    lines = []
    for item in summary.get("prescriptions") or []:
        if not isinstance(item, dict):
            continue
        lines.append(
            {
                "medicine_name": item.get("drug_name") or "",
                "frequency": item.get("timing_pattern") or item.get("frequency_display") or "",
                "duration": item.get("duration_display") or "",
            },
        )
    return lines


def _tests_advised(summary: dict) -> list[str]:
    rows = summary.get("investigations") or []
    names: list[str] = []
    for item in rows:
        if isinstance(item, dict):
            label = (item.get("name") or item.get("test_name") or item.get("label") or "").strip()
            if label:
                names.append(label)
        elif isinstance(item, str) and item.strip():
            names.append(item.strip())
    return names


def build_clinical_visit_detail_payload(encounter) -> dict:
    profile = encounter.patient_profile
    consultation = getattr(encounter, "consultation", None)
    prescription = _active_prescription(consultation)
    started = _started_at(encounter)

    summary: dict = {}
    if consultation is not None:
        summary = build_consultation_summary(
            consultation_id=consultation.id,
            profile="full",
        )

    reports_qs = ReportQueryService.get_reports_for_encounter(encounter=encounter)
    report_rows = [
        ReportSummaryListSerializer.from_dto(build_report_summary_dto(report)).data
        for report in reports_qs
    ]
    for row in report_rows:
        report_id = row.get("report_id")
        if report_id:
            row["download_url"] = f"/api/v1/diagnostics/reports/{report_id}/download/"

    return {
        "visit_id": str(encounter.id),
        "visit_pnr": encounter.visit_pnr or "",
        "consultation_id": str(consultation.id) if consultation else None,
        "prescription_id": str(prescription.id) if prescription else None,
        "patient": {
            "name": _patient_display_name(profile),
            "age": getattr(profile, "age", None) if profile else None,
            "gender": (getattr(profile, "gender", None) or "").strip() if profile else "",
            "mobile": _patient_mobile(profile),
            "uhid": (getattr(profile, "public_id", None) or "").strip() if profile else "",
        },
        "visit": {
            "visit_type": visit_type_for_api(encounter.encounter_type),
            "status": encounter_status_for_api(encounter.status),
            "doctor_name": _doctor_display_name(encounter),
            "doctor_id": str(encounter.doctor_id) if encounter.doctor_id else None,
            "date": timezone.localtime(started).date().isoformat() if started else None,
            "time": timezone.localtime(started).strftime("%H:%M") if started else None,
            "started_at": started.isoformat() if started else None,
            "duration_minutes": _duration_minutes(encounter),
        },
        "clinical_summary": {
            "chief_complaints": _symptoms_text(summary),
            "diagnosis": _diagnosis_text(summary),
            "advice": _advice_text(summary),
        },
        "prescription_lines": _prescription_lines(summary),
        "tests_advised": _tests_advised(summary),
        "reports": report_rows,
        "has_prescription": prescription is not None,
        "tests_count": len(_tests_advised(summary)) or int(getattr(encounter, "tests_count", 0) or 0),
        "reports_count": len(report_rows),
    }

"""Shared JSON bodies for chain tests (E2E + per-step). Keep in sync with API serializers."""

from datetime import time, timedelta

from django.utils import timezone


def appointment_payload(doctor, clinic, patient_account, patient_profile, **overrides):
    day = timezone.localdate() + timedelta(days=1)
    body = {
        "patient_account_id": str(patient_account.id),
        "patient_profile_id": str(patient_profile.id),
        "doctor_id": str(doctor.id),
        "clinic_id": str(clinic.id),
        "appointment_date": day.isoformat(),
        "slot_start_time": time(10, 0).strftime("%H:%M:%S"),
        "slot_end_time": time(10, 30).strftime("%H:%M:%S"),
        "consultation_mode": "clinic",
        "appointment_type": "new",
        "consultation_fee": "100.00",
        "notes": "",
    }
    body.update(overrides)
    return body


def check_in_payload(clinic, doctor, patient_account, patient_profile, appointment_id=None, **overrides):
    body = {
        "clinic_id": str(clinic.id),
        "doctor_id": str(doctor.id),
        "patient_account_id": str(patient_account.id),
        "patient_profile_id": str(patient_profile.id),
    }
    if appointment_id is not None:
        body["appointment_id"] = str(appointment_id)
    body.update(overrides)
    return body


def end_consultation_payload(*, drug_id=None, **section_overrides):
    """Same shape as consultations_core.tests.test_end_consultation_integration._base_payload."""
    store = {
        "sectionItems": {
            "symptoms": [],
            "findings": [],
            "diagnosis": [],
            "medicines": [],
            "investigations": [],
            "instructions": {
                "template_instructions": [],
                "custom_instructions": [],
            },
        },
        "draftFindings": [],
    }
    if drug_id is not None:
        store["sectionItems"]["medicines"] = [
            {
                "detail": {
                    "medicine": {
                        "drug_id": str(drug_id),
                        "dose_value": 1,
                        "dose_unit_id": "tablet",
                        "route_id": "oral",
                        "frequency_id": "BD",
                        "duration_value": 3,
                        "duration_unit": "days",
                    }
                }
            }
        ]
    for key, val in section_overrides.items():
        if key in store["sectionItems"]:
            store["sectionItems"][key] = val
    return {"mode": "commit", "store": store}

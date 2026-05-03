"""Build queue payloads and push Smart Queue realtime updates (Redis + channels)."""

from django.utils.timezone import localdate

from queue_management.models import Queue
from queue_management.services.queue_realtime import publish_queue_update, update_queue_sorted_set


def _build_active_queue_payload(*, doctor_id, clinic_id, queue_date):
    rows = (
        Queue.objects.filter(
            doctor_id=doctor_id,
            clinic_id=clinic_id,
            created_at__date=queue_date,
            status__in=("waiting", "vitals_done"),
        )
        .select_related(
            "patient",
            "appointment",
            "encounter",
            "encounter__pre_consultation",
            "encounter__pre_consultation__preconsultationvitals",
        )
        .only(
            "id",
            "encounter_id",
            "patient_id",
            "appointment_id",
            "status",
            "position_in_queue",
            "created_at",
            "patient__first_name",
            "patient__last_name",
            "patient__public_id",
            "patient__gender",
            "patient__date_of_birth",
            "patient__age_years",
            "encounter__visit_pnr",
            "encounter__pre_consultation__id",
            "encounter__pre_consultation__preconsultationvitals__data",
        )
        .order_by("position_in_queue", "created_at", "id")
    )
    payload = []
    for row in rows:
        patient = row.patient
        enc = getattr(row, "encounter", None)
        visit_pnr = None
        if enc is not None:
            pnr = getattr(enc, "visit_pnr", None)
            visit_pnr = str(pnr) if pnr else None
        gender = (patient.gender or "").lower()
        if gender == "male":
            gender = "M"
        elif gender == "female":
            gender = "F"
        elif gender == "other":
            gender = "O"
        else:
            gender = patient.gender or None

        token = None
        appointment = getattr(row, "appointment", None)
        if appointment:
            for key in ("token_number", "token", "queue_number"):
                value = getattr(appointment, key, None)
                if value:
                    token = str(value)
                    break

        payload.append(
            {
                "id": str(row.id),
                "encounter_id": str(row.encounter_id) if row.encounter_id else None,
                "patient_profile_id": str(row.patient_id) if row.patient_id else None,
                "visit_pnr": visit_pnr,
                "patient_public_id": str(patient.public_id) if getattr(patient, "public_id", None) else None,
                "patient_name": " ".join(x for x in [patient.first_name or "", patient.last_name or ""] if x).strip() or "Patient",
                "age": patient.age if patient.date_of_birth else patient.age_years,
                "gender": gender,
                "status": row.status,
                "token": token,
                "position": int(row.position_in_queue),
            }
        )
    return payload


def get_top_queue(doctor_id, clinic_id):
    today = localdate()
    active_queue = _build_active_queue_payload(
        doctor_id=doctor_id,
        clinic_id=clinic_id,
        queue_date=today,
    )
    return {
        "top_queue": active_queue[:3],
        "total_active": len(active_queue),
    }


def _sync_queue_realtime(*, doctor_id, clinic_id, queue_date):
    queue_payload = _build_active_queue_payload(
        doctor_id=doctor_id,
        clinic_id=clinic_id,
        queue_date=queue_date,
    )
    update_queue_sorted_set(
        clinic_id=str(clinic_id),
        doctor_id=str(doctor_id),
        queue_date=queue_date,
        queue_rows=queue_payload,
    )
    publish_queue_update(
        clinic_id=str(clinic_id),
        doctor_id=str(doctor_id),
        queue_date=queue_date,
        queue_rows=queue_payload,
    )

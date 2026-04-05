from __future__ import annotations

import uuid

from django.http import QueryDict
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from consultations_core.models import Consultation
from medicines.api.serializers import MedicineHybridQuerySerializer
from medicines.services.hybrid_engine import run_hybrid


def _query_dict_to_hybrid_validation_payload(qp: QueryDict) -> dict:
    raw_limit = qp.get("limit")
    limit_val: int | None = None
    if raw_limit not in (None, ""):
        try:
            limit_val = int(raw_limit)
        except ValueError:
            limit_val = None

    def parse_uuid_list(key: str) -> list[uuid.UUID]:
        out: list[uuid.UUID] = []
        for item in qp.getlist(key):
            if not item or not str(item).strip():
                continue
            try:
                out.append(uuid.UUID(str(item).strip()))
            except ValueError:
                continue
        return out

    payload: dict = {
        "q": qp.get("q") or "",
        "doctor_id": qp.get("doctor_id"),
        "patient_id": qp.get("patient_id") or None,
        "consultation_id": qp.get("consultation_id") or None,
        "diagnosis_ids": parse_uuid_list("diagnosis_ids"),
        "symptom_ids": parse_uuid_list("symptom_ids"),
        "limit": limit_val if limit_val is not None else 10,
    }
    if payload["patient_id"] == "":
        payload["patient_id"] = None
    if payload["consultation_id"] == "":
        payload["consultation_id"] = None
    return payload


class MedicineHybridAPIView(APIView):
    """
    GET /api/medicines/hybrid/?q=&doctor_id=&patient_id=&consultation_id=&diagnosis_ids=&limit=
    """

    def get(self, request):
        ser = MedicineHybridQuerySerializer(data=_query_dict_to_hybrid_validation_payload(request.query_params))
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        data = ser.validated_data
        doctor_id = data["doctor_id"]
        patient_id = data.get("patient_id")
        consultation_id = data.get("consultation_id")

        if str(request.user.id) != str(doctor_id):
            return Response(
                {"detail": "Unauthorized doctor access."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if patient_id is None and consultation_id is not None:
            patient_id = self._patient_id_from_consultation(consultation_id)

        limit = min(int(data["limit"]), 15)
        q_raw = data.get("q") or ""

        payload = run_hybrid(
            doctor_id=doctor_id,
            patient_id=patient_id,
            diagnosis_ids=data.get("diagnosis_ids") or [],
            symptom_ids=data.get("symptom_ids") or [],
            limit=limit,
            q_raw=q_raw,
        )
        return Response(payload)

    @staticmethod
    def _patient_id_from_consultation(consultation_id) -> uuid.UUID | None:
        return (
            Consultation.objects.filter(id=consultation_id)
            .values_list("encounter__patient_profile_id", flat=True)
            .first()
        )

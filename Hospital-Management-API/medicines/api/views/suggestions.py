from __future__ import annotations

import logging
import uuid

from django.http import QueryDict
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from consultations_core.models import Consultation
from medicines.models import DrugMaster
from medicines.api.serializers import (
    MedicineSuggestionsQuerySerializer,
    serialize_suggestion_response,
)
from medicines.services.autofill import build_autofill, load_master_cache
from medicines.services.cache import (
    get_cached_suggestions,
    set_cached_suggestions,
    suggestion_cache_key,
)
from medicines.services.suggestion_engine import MedicineSuggestionEngine

logger = logging.getLogger(__name__)


def _collect_drugs_from_buckets(buckets: dict[str, list[dict]]) -> dict[uuid.UUID, DrugMaster]:
    """Distinct DrugMaster instances across all suggestion buckets."""
    seen: dict[uuid.UUID, DrugMaster] = {}
    for rows in buckets.values():
        for r in rows:
            drug = r["drug"]
            seen[drug.id] = drug
    return seen


def _truthy(val: str | None) -> bool:
    if val is None:
        return False
    return val.lower() in ("1", "true", "yes", "on")


def _query_dict_to_validation_payload(qp: QueryDict) -> dict:
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
        "doctor_id": qp.get("doctor_id"),
        "patient_id": qp.get("patient_id") or None,
        "consultation_id": qp.get("consultation_id") or None,
        "diagnosis_ids": parse_uuid_list("diagnosis_ids"),
        "symptom_ids": parse_uuid_list("symptom_ids"),
        "limit": limit_val if limit_val is not None else 10,
        "include_scores": _truthy(qp.get("include_scores")),
    }
    if payload["patient_id"] == "":
        payload["patient_id"] = None
    if payload["consultation_id"] == "":
        payload["consultation_id"] = None
    return payload


class MedicineSuggestionsAPIView(APIView):
    """
    GET /api/medicines/suggestions/?doctor_id=&patient_id=&consultation_id=&diagnosis_ids=&limit=
    """

    def get(self, request):
        ser = MedicineSuggestionsQuerySerializer(data=_query_dict_to_validation_payload(request.query_params))
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

        diagnosis_ids_for_cache = sorted(str(x) for x in data.get("diagnosis_ids", []))
        patient_key = str(patient_id) if patient_id else "np"
        limit = min(int(data["limit"]), 15)
        include_scores = data.get("include_scores", False)

        cache_key = suggestion_cache_key(
            str(doctor_id),
            diagnosis_ids_for_cache,
            patient_key,
            limit,
        )
        cached = get_cached_suggestions(cache_key)
        if cached is not None:
            return Response(cached)

        logger.info("Medicine suggestions cache miss doctor_id=%s", doctor_id)

        engine = MedicineSuggestionEngine(
            doctor_id=doctor_id,
            patient_id=patient_id,
            diagnosis_ids=data.get("diagnosis_ids") or [],
            symptom_ids=data.get("symptom_ids") or [],
            limit=limit,
        )
        buckets = engine.run()
        unique_drugs = _collect_drugs_from_buckets(buckets)
        master_cache = load_master_cache()
        autofill_by_drug_id = {
            did: build_autofill(drug, master_cache=master_cache) for did, drug in unique_drugs.items()
        }
        payload = serialize_suggestion_response(
            buckets,
            include_scores=include_scores,
            autofill_by_drug_id=autofill_by_drug_id,
        )
        set_cached_suggestions(cache_key, payload)
        return Response(payload)

    @staticmethod
    def _patient_id_from_consultation(consultation_id) -> uuid.UUID | None:
        return (
            Consultation.objects.filter(id=consultation_id)
            .values_list("encounter__patient_profile_id", flat=True)
            .first()
        )

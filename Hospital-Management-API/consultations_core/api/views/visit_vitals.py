"""
GET/POST /api/visits/<visit_id>/vitals/ — helpdesk-friendly vitals UPSERT on ClinicalEncounter (visit_id).

Persists to PreConsultationVitals JSON (single source of truth with doctor pre-consult).
"""

from __future__ import annotations
import logging

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils.timezone import localdate
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from account.permissions import IsDoctorOrHelpdesk
from consultations_core.domain.vitals_meaningful import vitals_data_is_meaningful
from consultations_core.domain.encounter_status import normalize_encounter_status
from consultations_core.models.consultation import Consultation
from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.models.pre_consultation import PreConsultation, PreConsultationVitals
from consultations_core.services.preconsultation_section_service import PreConsultationSectionService
from consultations_core.services.preconsultation_service import (
    PreConsultationAlreadyExistsError,
    PreConsultationService,
)
from consultations_core.services.encounter_state_machine import EncounterStateMachine
from queue_management.models import Queue

logger = logging.getLogger(__name__)


class VisitVitalsWriteSerializer(serializers.Serializer):
    bp_systolic = serializers.IntegerField(required=False, allow_null=True, min_value=1, max_value=300)
    bp_diastolic = serializers.IntegerField(required=False, allow_null=True, min_value=1, max_value=200)
    weight = serializers.FloatField(required=False, allow_null=True, min_value=0)
    height = serializers.FloatField(required=False, allow_null=True, min_value=0)
    temperature = serializers.FloatField(required=False, allow_null=True)
    temperature_unit = serializers.ChoiceField(required=False, choices=("c", "f"), default="c")

    def validate(self, attrs):
        sys_v = attrs.get("bp_systolic")
        dia_v = attrs.get("bp_diastolic")
        has_sys = sys_v is not None
        has_dia = dia_v is not None
        if has_sys != has_dia:
            raise serializers.ValidationError(
                {"bp_systolic": "Systolic and diastolic must both be provided or both omitted."}
            )
        return attrs


def _specialty_for_encounter(encounter) -> str:
    doctor = encounter.doctor
    if doctor and getattr(doctor, "primary_specialization", None):
        code = (doctor.primary_specialization or "").strip().lower()
        if code:
            return code
    return "general"


def _get_or_create_preconsultation(encounter, user):
    try:
        return encounter.pre_consultation
    except PreConsultation.DoesNotExist:
        pass
    pc = PreConsultation.objects.filter(encounter=encounter).first()
    if pc is not None:
        return pc
    try:
        return PreConsultationService.create_preconsultation(
            encounter=encounter,
            specialty_code=_specialty_for_encounter(encounter),
            template_version="v1",
            entry_mode="helpdesk",
            created_by=user,
        )
    except PreConsultationAlreadyExistsError:
        return PreConsultation.objects.get(encounter=encounter)


def _existing_vitals_data(preconsultation) -> dict:
    try:
        row = PreConsultationVitals.objects.get(pre_consultation=preconsultation)
        return dict(row.data or {})
    except PreConsultationVitals.DoesNotExist:
        return {}


def _merge_vitals_payload(existing: dict, validated: dict) -> dict:
    data = dict(existing)
    sys_v = validated.get("bp_systolic")
    dia_v = validated.get("bp_diastolic")
    if "bp_systolic" in validated or "bp_diastolic" in validated:
        if sys_v is not None and dia_v is not None:
            data["bp"] = {"systolic": int(sys_v), "diastolic": int(dia_v)}
            data["blood_pressure"] = {"systolic": int(sys_v), "diastolic": int(dia_v)}
        elif sys_v is None and dia_v is None:
            data.pop("bp", None)
            data.pop("blood_pressure", None)
    if "weight" in validated:
        height_weight = dict(data.get("height_weight") or {})
        if validated["weight"] is not None:
            weight_kg = float(validated["weight"])
            data["weight_kg"] = weight_kg
            height_weight["weight_kg"] = weight_kg
        else:
            data.pop("weight_kg", None)
            data.pop("weight", None)
            height_weight.pop("weight_kg", None)
        if height_weight:
            data["height_weight"] = height_weight
        else:
            data.pop("height_weight", None)
    if "height" in validated:
        height_weight = dict(data.get("height_weight") or {})
        if validated["height"] is not None:
            # Helpdesk UI captures height in feet; normalize to cm for doctor pre-consult forms.
            height_ft = float(validated["height"])
            height_cm = round(height_ft * 30.48, 2)
            data["height_ft"] = height_ft
            data["height_cm"] = height_cm
            height_weight["height_cm"] = height_cm
        else:
            data.pop("height_ft", None)
            data.pop("height_cm", None)
            data.pop("height", None)
            height_weight.pop("height_cm", None)
        if height_weight:
            data["height_weight"] = height_weight
        else:
            data.pop("height_weight", None)
    if "temperature" in validated:
        if validated["temperature"] is not None:
            raw_temp = float(validated["temperature"])
            unit = str(validated.get("temperature_unit") or "c").lower()
            # Canonical storage is Celsius so doctor pre-consultation remains unit-consistent.
            temp_c = (raw_temp - 32.0) * (5.0 / 9.0) if unit == "f" else raw_temp
            data["temperature"] = {
                "value": round(temp_c, 3),
                "unit": "c",
                "source_unit": unit,
            }
        else:
            data.pop("temperature", None)
    return data


def _flatten_response(encounter_id, section_data: dict) -> dict:
    bp = section_data.get("bp") or section_data.get("blood_pressure") or {}
    if isinstance(bp, dict):
        sys_v = bp.get("systolic")
        dia_v = bp.get("diastolic")
        bp_str = f"{sys_v}/{dia_v}" if sys_v and dia_v else None
    elif isinstance(bp, str) and bp.strip():
        bp_str = bp.strip()
        sys_v = dia_v = None
    else:
        bp_str = None
        sys_v = dia_v = None
    raw_height_ft = section_data.get("height_ft")
    raw_height_cm = section_data.get("height_cm") or section_data.get("height")
    nested_height_cm = (section_data.get("height_weight") or {}).get("height_cm")
    height_ft = raw_height_ft
    if height_ft is None:
        source_cm = raw_height_cm if raw_height_cm is not None else nested_height_cm
        try:
            height_ft = round(float(source_cm) / 30.48, 2) if source_cm is not None else None
        except (TypeError, ValueError):
            height_ft = None
    temperature = section_data.get("temperature")
    temperature_unit = "c"
    if isinstance(temperature, dict):
        temperature = temperature.get("value")
        temperature_unit = str(section_data.get("temperature", {}).get("unit") or "c").lower()

    return {
        "visit_id": str(encounter_id),
        "bp": bp_str,
        "bp_systolic": sys_v,
        "bp_diastolic": dia_v,
        "weight": section_data.get("weight_kg") or (section_data.get("height_weight") or {}).get("weight_kg") or section_data.get("weight"),
        "height": height_ft,
        "temperature": temperature,
        "temperature_unit": temperature_unit,
    }


class VisitVitalsAPIView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]

    def get(self, request, visit_id):
        encounter = ClinicalEncounter.objects.filter(id=visit_id).first()
        if not encounter:
            return Response({"detail": "Visit not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            pre = encounter.pre_consultation
        except PreConsultation.DoesNotExist:
            pre = PreConsultation.objects.filter(encounter=encounter).first()
        if not pre:
            out = _flatten_response(encounter.id, {})
            out["status"] = "WAITING"
            return Response(out, status=status.HTTP_200_OK)
        data = _existing_vitals_data(pre)
        out = _flatten_response(encounter.id, data)
        out["status"] = "VITALS_DONE" if vitals_data_is_meaningful(data) else "WAITING"
        return Response(out, status=status.HTTP_200_OK)

    @transaction.atomic
    def post(self, request, visit_id):
        encounter = ClinicalEncounter.objects.select_for_update().filter(id=visit_id).first()
        if not encounter:
            return Response({"detail": "Visit not found."}, status=status.HTTP_404_NOT_FOUND)
        logger.info(
            "encounter.lifecycle.vitals.request encounter_id=%s visit_pnr=%s status=%s user_id=%s payload_keys=%s",
            encounter.id,
            encounter.visit_pnr,
            encounter.status,
            getattr(request.user, "id", None),
            ",".join(sorted(request.data.keys())),
        )
        normalized_status = normalize_encounter_status(encounter.status)
        if normalized_status in ("cancelled", "no_show"):
            return Response({"detail": "Visit is not active."}, status=status.HTTP_400_BAD_REQUEST)
        if normalized_status in ("consultation_completed", "closed"):
            return Response(
                {"detail": "Visit is read-only; consultation has started or visit is closed."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Source of truth: clinical consultation row, not encounter.status alone.
        # Legacy rows may still store `in_consultation` while no Consultation exists — helpdesk must
        # be able to continue vitals during pre-consult.
        has_consultation = Consultation.objects.filter(encounter_id=encounter.pk).exists()
        if has_consultation:
            return Response(
                {"detail": "Visit is read-only; consultation has started or visit is closed."},
                status=status.HTTP_403_FORBIDDEN,
            )

        ser = VisitVitalsWriteSerializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        validated = ser.validated_data

        try:
            preconsultation = _get_or_create_preconsultation(encounter, request.user)
        except PreConsultationAlreadyExistsError:
            preconsultation = PreConsultation.objects.get(encounter=encounter)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        preconsultation.refresh_from_db(fields=["is_locked", "locked_at", "lock_reason"])
        if preconsultation.is_locked and not has_consultation:
            logger.warning(
                "encounter.lifecycle.vitals.clear_orphan_preconsult_lock encounter_id=%s visit_pnr=%s",
                encounter.id,
                encounter.visit_pnr,
            )
            PreConsultation.objects.filter(pk=preconsultation.pk, is_locked=True).update(
                is_locked=False,
                locked_at=None,
                lock_reason=None,
            )
            preconsultation.refresh_from_db(fields=["is_locked", "locked_at", "lock_reason"])
        logger.info(
            "encounter.lifecycle.vitals.preconsultation_ready encounter_id=%s preconsultation_id=%s visit_pnr=%s",
            encounter.id,
            preconsultation.id,
            encounter.visit_pnr,
        )

        existing = _existing_vitals_data(preconsultation)
        merged = _merge_vitals_payload(existing, validated)

        try:
            PreConsultationSectionService.upsert_section(
                section_model=PreConsultationVitals,
                preconsultation=preconsultation,
                data=merged,
                user=request.user,
                schema_version="v1",
            )
        except DjangoValidationError as e:
            msg = getattr(e, "message", None) or str(e)
            return Response({"detail": msg}, status=status.HTTP_400_BAD_REQUEST)

        if vitals_data_is_meaningful(merged):
            today = localdate()
            queue_rows = Queue.objects.filter(encounter_id=encounter.id, created_at__date=today).exclude(
                status__in=("completed", "cancelled", "skipped")
            )
            updated_count = queue_rows.update(status="vitals_done")
            logger.info(
                "encounter.lifecycle.vitals.mark_queue_done encounter_id=%s visit_pnr=%s updated_rows=%s",
                encounter.id,
                encounter.visit_pnr,
                updated_count,
            )

            enc = ClinicalEncounter.objects.select_for_update().get(pk=encounter.pk)
            if normalize_encounter_status(enc.status) == "created":
                try:
                    EncounterStateMachine.start_pre_consultation(enc, user=request.user)
                except DjangoValidationError:
                    pass
            logger.info(
                "encounter.lifecycle.vitals.saved encounter_id=%s preconsultation_id=%s visit_pnr=%s status=%s meaningful=%s",
                encounter.id,
                preconsultation.id,
                encounter.visit_pnr,
                enc.status,
                True,
            )
        else:
            logger.info(
                "encounter.lifecycle.vitals.saved encounter_id=%s preconsultation_id=%s visit_pnr=%s status=%s meaningful=%s",
                encounter.id,
                preconsultation.id,
                encounter.visit_pnr,
                encounter.status,
                False,
            )

        body = _flatten_response(encounter.id, merged)
        body["status"] = "VITALS_DONE" if vitals_data_is_meaningful(merged) else "WAITING"
        return Response(body, status=status.HTTP_200_OK)

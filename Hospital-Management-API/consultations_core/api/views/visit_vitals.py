"""
GET/POST /api/visits/<visit_id>/vitals/ — helpdesk-friendly vitals UPSERT on ClinicalEncounter (visit_id).

Persists to PreConsultationVitals JSON (single source of truth with doctor pre-consult).
"""

from __future__ import annotations

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
from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.models.pre_consultation import PreConsultation, PreConsultationVitals
from consultations_core.services.preconsultation_section_service import PreConsultationSectionService
from consultations_core.services.preconsultation_service import (
    PreConsultationAlreadyExistsError,
    PreConsultationService,
)
from consultations_core.services.encounter_state_machine import EncounterStateMachine
from queue_management.models import Queue


class VisitVitalsWriteSerializer(serializers.Serializer):
    bp_systolic = serializers.IntegerField(required=False, allow_null=True, min_value=1, max_value=300)
    bp_diastolic = serializers.IntegerField(required=False, allow_null=True, min_value=1, max_value=200)
    weight = serializers.FloatField(required=False, allow_null=True, min_value=0)
    height = serializers.FloatField(required=False, allow_null=True, min_value=0)
    temperature = serializers.FloatField(required=False, allow_null=True)

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
    if not encounter.doctor:
        raise ValueError("Encounter must have a doctor before recording vitals.")
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
        elif sys_v is None and dia_v is None:
            data.pop("bp", None)
    if "weight" in validated:
        if validated["weight"] is not None:
            data["weight_kg"] = float(validated["weight"])
        else:
            data.pop("weight_kg", None)
            data.pop("weight", None)
    if "height" in validated:
        if validated["height"] is not None:
            data["height_cm"] = float(validated["height"])
        else:
            data.pop("height_cm", None)
            data.pop("height", None)
    if "temperature" in validated:
        if validated["temperature"] is not None:
            data["temperature"] = float(validated["temperature"])
        else:
            data.pop("temperature", None)
    return data


def _flatten_response(encounter_id, section_data: dict) -> dict:
    bp = section_data.get("bp") or {}
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
    return {
        "visit_id": str(encounter_id),
        "bp": bp_str,
        "bp_systolic": bp.get("systolic") if isinstance(bp, dict) else None,
        "bp_diastolic": bp.get("diastolic") if isinstance(bp, dict) else None,
        "weight": section_data.get("weight_kg") or section_data.get("weight"),
        "height": section_data.get("height_cm") or section_data.get("height"),
        "temperature": section_data.get("temperature"),
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
        encounter = ClinicalEncounter.objects.filter(id=visit_id).first()
        if not encounter:
            return Response({"detail": "Visit not found."}, status=status.HTTP_404_NOT_FOUND)
        if encounter.status in ("cancelled", "no_show"):
            return Response({"detail": "Visit is not active."}, status=status.HTTP_400_BAD_REQUEST)
        if encounter.status in ("consultation_in_progress", "consultation_completed", "closed"):
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
            Queue.objects.filter(encounter_id=encounter.id, created_at__date=today).exclude(
                status__in=("completed", "cancelled", "skipped")
            ).update(status="vitals_done")

            enc = ClinicalEncounter.objects.select_for_update().get(pk=encounter.pk)
            if enc.status == "created":
                try:
                    EncounterStateMachine.start_pre_consultation(enc, user=request.user)
                except DjangoValidationError:
                    pass

        body = _flatten_response(encounter.id, merged)
        body["status"] = "VITALS_DONE" if vitals_data_is_meaningful(merged) else "WAITING"
        return Response(body, status=status.HTTP_200_OK)

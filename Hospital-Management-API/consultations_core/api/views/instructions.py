# consultations_core/api/views/instructions.py
import logging
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from account.permissions import IsDoctor
from consultations_core.models.consultation import Consultation
from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.models.instruction import (
    InstructionCategory,
    InstructionTemplate,
    InstructionTemplateVersion,
    SpecialtyInstructionMapping,
    EncounterInstruction,
)
from consultations_core.api.serializers.instructions import (
    InstructionCategorySerializer,
    InstructionTemplateListSerializer,
    EncounterInstructionSerializer,
    AddInstructionSerializer,
    UpdateInstructionSerializer,
)

logger = logging.getLogger(__name__)

MSG_VISIT_CANCELLED = "This visit has been cancelled. Please start a new one."


def _normalize_specialty(raw: str) -> str:
    return (raw or "").strip().lower().replace(" ", "_")


def _get_consultation_or_none(encounter: ClinicalEncounter):
    try:
        return encounter.consultation
    except Consultation.DoesNotExist:
        return None


def _consultation_finalized(encounter: ClinicalEncounter) -> bool:
    consultation = _get_consultation_or_none(encounter)
    return consultation is not None and consultation.is_finalized


class InstructionTemplatesAPIView(APIView):
    """
    GET /consultations/{encounter_id}/instructions/templates/
    Returns categories and instruction templates for the encounter's specialty.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def get(self, request, encounter_id):
        encounter = get_object_or_404(ClinicalEncounter, id=encounter_id)
        if encounter.status in ("cancelled", "no_show"):
            return Response(
                {"detail": MSG_VISIT_CANCELLED},
                status=status.HTTP_400_BAD_REQUEST,
            )
        doctor = encounter.doctor
        if not doctor:
            return Response(
                {"detail": "Encounter has no doctor assigned."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        specialty_key = _normalize_specialty(doctor.primary_specialization or "")
        if not specialty_key:
            return Response(
                {"detail": "Doctor specialty is required to load instruction templates."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        mappings = (
            SpecialtyInstructionMapping.objects.filter(
                specialty=specialty_key,
                is_active=True,
            )
            .select_related("instruction", "instruction__category")
            .filter(instruction__is_active=True)
            .order_by("display_order", "instruction__category__display_order", "instruction__label")
        )

        seen_categories = {}
        categories_list = []
        templates_list = []

        for m in mappings:
            tpl = m.instruction
            cat = tpl.category
            if cat.id not in seen_categories:
                seen_categories[cat.id] = len(categories_list)
                categories_list.append(cat)
            setattr(tpl, "_mapping_display_order", m.display_order)
            templates_list.append(tpl)

        return Response({
            "categories": InstructionCategorySerializer(categories_list, many=True).data,
            "templates": InstructionTemplateListSerializer(templates_list, many=True).data,
        })


class EncounterInstructionsListCreateAPIView(APIView):
    """
    GET  /consultations/{encounter_id}/instructions/  — list added instructions
    POST /consultations/{encounter_id}/instructions/  — add instruction
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def get_encounter(self, encounter_id):
        return get_object_or_404(ClinicalEncounter, id=encounter_id)

    def get(self, request, encounter_id):
        encounter = self.get_encounter(encounter_id)
        if encounter.status in ("cancelled", "no_show"):
            return Response(
                {"detail": MSG_VISIT_CANCELLED},
                status=status.HTTP_400_BAD_REQUEST,
            )
        qs = EncounterInstruction.objects.filter(
            encounter=encounter,
            is_active=True,
        ).select_related("instruction_template", "template_version")
        serializer = EncounterInstructionSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request, encounter_id):
        encounter = self.get_encounter(encounter_id)
        if encounter.status in ("cancelled", "no_show"):
            return Response(
                {"detail": MSG_VISIT_CANCELLED},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if _consultation_finalized(encounter):
            return Response(
                {"detail": "Consultation is finalized; cannot add instructions."},
                status=status.HTTP_403_FORBIDDEN,
            )

        payload = AddInstructionSerializer(data=request.data)
        if not payload.is_valid():
            return Response(payload.errors, status=status.HTTP_400_BAD_REQUEST)
        data = payload.validated_data

        template = get_object_or_404(
            InstructionTemplate,
            id=data["instruction_template_id"],
            is_active=True,
        )
        input_data = data.get("input_data") or {}
        custom_note = (data.get("custom_note") or "").strip()

        if template.requires_input and not isinstance(input_data, dict):
            return Response(
                {"input_data": "Must be an object when template requires input."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        duplicate = EncounterInstruction.objects.filter(
            encounter=encounter,
            instruction_template=template,
            is_active=True,
        ).exists()
        if duplicate:
            return Response(
                {"detail": "This instruction is already added for this encounter."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        version, _ = InstructionTemplateVersion.objects.get_or_create(
            template=template,
            version_number=template.version,
            defaults={
                "label_snapshot": template.label,
                "input_schema_snapshot": template.input_schema,
            },
        )

        ei = EncounterInstruction.objects.create(
            encounter=encounter,
            instruction_template=template,
            template_version=version,
            input_data=input_data,
            custom_note=custom_note,
            is_active=True,
            added_by=request.user,
        )
        serializer = EncounterInstructionSerializer(ei)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class EncounterInstructionUpdateDeleteAPIView(APIView):
    """
    PATCH /instructions/{id}/  — update input_data / custom_note
    DELETE /instructions/{id}/ — soft delete (set is_active=False)
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def get_instruction(self, pk):
        return get_object_or_404(
            EncounterInstruction.objects.select_related("encounter", "instruction_template"),
            id=pk,
        )

    def patch(self, request, pk):
        ei = self.get_instruction(pk)
        if ei.encounter.status in ("cancelled", "no_show"):
            return Response(
                {"detail": MSG_VISIT_CANCELLED},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if _consultation_finalized(ei.encounter):
            return Response(
                {"detail": "Consultation is finalized; cannot update instructions."},
                status=status.HTTP_403_FORBIDDEN,
            )
        payload = UpdateInstructionSerializer(data=request.data, partial=True)
        if not payload.is_valid():
            return Response(payload.errors, status=status.HTTP_400_BAD_REQUEST)
        data = payload.validated_data
        if "input_data" in data:
            ei.input_data = data["input_data"]
        if "custom_note" in data:
            ei.custom_note = data["custom_note"]
        ei.save()
        serializer = EncounterInstructionSerializer(ei)
        return Response(serializer.data)

    def delete(self, request, pk):
        ei = self.get_instruction(pk)
        if ei.encounter.status in ("cancelled", "no_show"):
            return Response(
                {"detail": MSG_VISIT_CANCELLED},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if _consultation_finalized(ei.encounter):
            return Response(
                {"detail": "Consultation is finalized; cannot remove instructions."},
                status=status.HTTP_403_FORBIDDEN,
            )
        ei.is_active = False
        ei.save(update_fields=["is_active"])
        return Response(status=status.HTTP_204_NO_CONTENT)

import logging

from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from account.permissions import IsDoctor
from consultations_core.domain.locks import EncounterLockValidator
from consultations_core.api.serializers.investigations import (
    AddInvestigationItemSerializer,
    CustomInvestigationCreateSerializer,
    investigation_item_to_dict,
    PatchInvestigationItemSerializer,
)
from consultations_core.models.consultation import Consultation
from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.models.investigation import (
    CustomInvestigation,
    InvestigationItem,
    InvestigationSource,
    InvestigationUrgency,
)
from consultations_core.services.investigation_api_service import (
    add_investigation_item,
    get_or_create_custom_investigation_master,
    get_or_create_investigations_container,
    reposition_active_item,
    soft_delete_item,
)
from diagnostics_engine.models import DiagnosticPackage, DiagnosticServiceMaster

logger = logging.getLogger(__name__)

MSG_VISIT_CANCELLED = "This visit has been cancelled. Please start a new one."


def _get_consultation(consultation_id):
    return get_object_or_404(Consultation.objects.select_related("encounter", "encounter__clinic"), pk=consultation_id)


def _guard_read(encounter: ClinicalEncounter):
    if encounter.status in ("cancelled", "no_show"):
        return Response({"detail": MSG_VISIT_CANCELLED}, status=status.HTTP_400_BAD_REQUEST)
    return None


def _guard_mutate(encounter: ClinicalEncounter, consultation: Consultation):
    err = _guard_read(encounter)
    if err:
        return err
    try:
        EncounterLockValidator.validate_investigation_mutation(consultation)
    except DjangoValidationError as e:
        msgs = list(getattr(e, "messages", []) or [])
        detail = "; ".join(str(m) for m in msgs if str(m).strip()) or str(e)
        code = status.HTTP_400_BAD_REQUEST
        if encounter.status == "closed" or (
            encounter.status == "consultation_in_progress" and consultation.is_finalized
        ):
            code = status.HTTP_403_FORBIDDEN
        return Response({"detail": detail}, status=code)
    return None


class ConsultationInvestigationItemsListCreateAPIView(APIView):
    """
    GET/POST /api/consultations/<consultation_id>/investigations/items/
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def get(self, request, consultation_id):
        consultation = _get_consultation(consultation_id)
        encounter = consultation.encounter
        err = _guard_read(encounter)
        if err:
            return err

        container = get_or_create_investigations_container(consultation)
        qs = (
            InvestigationItem.objects.filter(investigations=container, is_deleted=False)
            .ui_ready()
            .order_by("position", "created_at")
        )
        items = [investigation_item_to_dict(x) for x in qs]
        return Response({"items": items})

    def post(self, request, consultation_id):
        consultation = _get_consultation(consultation_id)
        encounter = consultation.encounter
        err = _guard_mutate(encounter, consultation)
        if err:
            return err

        ser = AddInvestigationItemSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

        data = ser.validated_data
        container = get_or_create_investigations_container(consultation)

        try:
            if data["source"] == InvestigationSource.CATALOG:
                catalog_item = get_object_or_404(
                    DiagnosticServiceMaster.objects.filter(is_active=True, deleted_at__isnull=True),
                    pk=data["catalog_item_id"],
                )
                item, meta = add_investigation_item(
                    container=container,
                    source=InvestigationSource.CATALOG,
                    user=request.user,
                    catalog_item=catalog_item,
                    position=data.get("position"),
                    instructions=data.get("instructions"),
                    notes=data.get("notes"),
                    urgency=data.get("urgency") or None,
                )

            elif data["source"] == InvestigationSource.CUSTOM:
                custom_inv = None
                if data.get("custom_investigation_id"):
                    custom_inv = get_object_or_404(CustomInvestigation, pk=data["custom_investigation_id"])
                item, meta = add_investigation_item(
                    container=container,
                    source=InvestigationSource.CUSTOM,
                    user=request.user,
                    custom_investigation=custom_inv,
                    adhoc_name=(data.get("name") or "").strip() or None,
                    adhoc_type=data.get("investigation_type"),
                    position=data.get("position"),
                    instructions=data.get("instructions"),
                    notes=data.get("notes"),
                    urgency=data.get("urgency") or None,
                )

            else:
                package = get_object_or_404(
                    DiagnosticPackage.objects.filter(is_active=True, is_latest=True, deleted_at__isnull=True),
                    pk=data["diagnostic_package_id"],
                )
                item, meta = add_investigation_item(
                    container=container,
                    source=InvestigationSource.PACKAGE,
                    user=request.user,
                    diagnostic_package=package,
                    position=data.get("position"),
                    instructions=data.get("instructions"),
                    notes=data.get("notes"),
                    urgency=data.get("urgency") or None,
                )

            item = InvestigationItem.objects.ui_ready().get(pk=item.pk)
            payload = {
                "item": investigation_item_to_dict(item),
                "meta": {
                    "duplicate": meta.get("duplicate", False),
                    "restored": meta.get("restored", False),
                    "package_lines": meta.get("package_lines"),
                },
            }
            is_new = not meta.get("duplicate") and not meta.get("restored")
            status_code = status.HTTP_201_CREATED if is_new else status.HTTP_200_OK
            return Response(payload, status=status_code)

        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except DjangoValidationError as e:
            msg = "; ".join(e.messages) if hasattr(e, "messages") else str(e)
            return Response({"detail": msg}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception("Investigation item create failed: %s", e)
            return Response(
                {"detail": str(e) or "Failed to add investigation item."},
                status=status.HTTP_400_BAD_REQUEST,
            )


class ConsultationInvestigationItemDetailAPIView(APIView):
    """
    PATCH/DELETE /api/consultations/<consultation_id>/investigations/items/<item_id>/
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def patch(self, request, consultation_id, item_id):
        consultation = _get_consultation(consultation_id)
        encounter = consultation.encounter
        err = _guard_mutate(encounter, consultation)
        if err:
            return err

        container = get_or_create_investigations_container(consultation)
        item = get_object_or_404(
            InvestigationItem.objects.filter(investigations=container, is_deleted=False),
            pk=item_id,
        )

        ser = PatchInvestigationItemSerializer(data=request.data, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        data = ser.validated_data

        try:
            if "instructions" in data:
                item.instructions = data["instructions"]
            if "notes" in data:
                item.notes = data["notes"]
            if "urgency" in data and data["urgency"]:
                if data["urgency"] not in [c[0] for c in InvestigationUrgency.choices]:
                    return Response(
                        {"urgency": "Invalid urgency value."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                item.urgency = data["urgency"]
            item.updated_by = request.user

            if "position" in data and data["position"] is not None:
                item.save()
                item.refresh_from_db()
                reposition_active_item(container, item, data["position"])
            else:
                item.save()

            item = InvestigationItem.objects.ui_ready().get(pk=item.pk)
            return Response(investigation_item_to_dict(item))
        except DjangoValidationError as e:
            msg = "; ".join(e.messages) if hasattr(e, "messages") else str(e)
            return Response({"detail": msg}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, consultation_id, item_id):
        consultation = _get_consultation(consultation_id)
        encounter = consultation.encounter
        err = _guard_mutate(encounter, consultation)
        if err:
            return err

        container = get_or_create_investigations_container(consultation)
        item = get_object_or_404(
            InvestigationItem.objects.filter(investigations=container, is_deleted=False),
            pk=item_id,
        )

        try:
            soft_delete_item(item, user=request.user)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except DjangoValidationError as e:
            msg = "; ".join(e.messages) if hasattr(e, "messages") else str(e)
            return Response({"detail": msg}, status=status.HTTP_400_BAD_REQUEST)


class CustomInvestigationCreateAPIView(APIView):
    """
    POST /api/investigations/custom/
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def post(self, request):
        ser = CustomInvestigationCreateSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

        data = ser.validated_data
        consultation = None
        clinic = None
        if data.get("consultation_id"):
            consultation = get_object_or_404(
                Consultation.objects.select_related("encounter", "encounter__clinic"),
                pk=data["consultation_id"],
            )
            err = _guard_mutate(consultation.encounter, consultation)
            if err:
                return err
            clinic = consultation.encounter.clinic

        try:
            row, created = get_or_create_custom_investigation_master(
                name=data["name"],
                investigation_type=data["investigation_type"],
                user=request.user,
                clinic=clinic,
            )
            return Response(
                {"id": str(row.id), "name": row.name},
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
            )
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

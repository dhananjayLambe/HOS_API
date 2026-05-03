# Standard Library Imports
import io
import logging
import os
import uuid
from datetime import datetime
from django.conf import settings
from rest_framework.permissions import (
    IsAuthenticated,
)
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from rest_framework import generics, permissions, status, views, viewsets
# Django Imports
from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from django.db import transaction
from django.db import IntegrityError
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
# Local App Imports
from account.permissions import IsDoctor
from consultations_core.services.consultation_engine import ConsultationEngine
from consultations_core.services.metadata_loader import MetadataLoader
from consultations_core.services.preconsultation_service import (
    PreConsultationService,
    PreConsultationAlreadyExistsError,
)
from consultations_core.services.preconsultation_section_service import PreConsultationSectionService
from consultations_core.services.consultation_start_service import start_consultation_for_encounter
from consultations_core.services.encounter_service import EncounterService
from consultations_core.services.encounter_state_machine import EncounterStateMachine
from consultations_core.services.end_consultation_service import persist_consultation_end_state
from consultations_core.domain.encounter_status import encounter_status_for_api, normalize_encounter_status
from patient_account.models import PatientProfile
from clinic.models import Clinic

from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.models.consultation import Consultation
from consultations_core.models.pre_consultation import(
     PreConsultation, 
     PreConsultationVitals, 
     PreConsultationChiefComplaint,
     PreConsultationAllergies, 
     PreConsultationMedicalHistory
)
from collections import OrderedDict


logger = logging.getLogger(__name__)


def _vitals_data_for_api(raw_data):
    """Normalize legacy/flat vitals JSON into doctor-form compatible nested shape."""
    if not isinstance(raw_data, dict):
        return raw_data

    data = dict(raw_data)

    bp = data.get("bp")
    blood_pressure = data.get("blood_pressure")
    if not isinstance(blood_pressure, dict):
        if isinstance(bp, dict):
            blood_pressure = {
                "systolic": bp.get("systolic"),
                "diastolic": bp.get("diastolic"),
            }
        else:
            blood_pressure = {}
    if blood_pressure:
        data["blood_pressure"] = blood_pressure

    height_weight = dict(data.get("height_weight") or {})
    weight_kg = data.get("weight_kg")
    if weight_kg is None:
        weight_kg = data.get("weight")
    if weight_kg is not None and "weight_kg" not in height_weight:
        height_weight["weight_kg"] = weight_kg

    height_cm = data.get("height_cm")
    if height_cm is None:
        height_cm = data.get("height")
    if height_cm is None:
        height_ft = data.get("height_ft")
        try:
            height_cm = round(float(height_ft) * 30.48, 2) if height_ft is not None else None
        except (TypeError, ValueError):
            height_cm = None
    if height_cm is not None and "height_cm" not in height_weight:
        height_weight["height_cm"] = height_cm
    if height_weight:
        data["height_weight"] = height_weight

    temperature = data.get("temperature")
    if isinstance(temperature, (int, float, str)):
        data["temperature"] = {"value": temperature, "unit": "c"}
    elif isinstance(temperature, dict) and "value" in temperature:
        data["temperature"] = {
            "value": temperature.get("value"),
            "unit": (temperature.get("unit") or "c"),
        }

    return data

# Phase-1: single message for all "cancelled encounter" guards
MSG_VISIT_CANCELLED = "This visit has been cancelled. Please start a new one."


def _contract_error(message, errors=None):
    return {
        "status": "error",
        "message": message,
        "errors": errors or {},
    }

# =====================================================
# PRE-CONSULTATION SECTION APIs
# =====================================================

SECTION_MODEL_MAP = {
    "vitals": PreConsultationVitals,
    "chief_complaint": PreConsultationChiefComplaint,
    "allergies": PreConsultationAllergies,
    "medical_history": PreConsultationMedicalHistory,
}


def _prune_empty_values(value):
    """
    Recursively remove structurally empty values from JSON-like data.
    Returns a cleaned value, or None if the entire structure is empty.
    """
    if value is None:
        return None

    # Strings: normalise whitespace-only to None
    if isinstance(value, str):
        return value if value.strip() else None

    # Lists / tuples: prune empty children
    if isinstance(value, (list, tuple)):
        cleaned_items = []
        for item in value:
            cleaned = _prune_empty_values(item)
            if cleaned is not None:
                cleaned_items.append(cleaned)
        return cleaned_items or None

    # Dicts: drop keys whose values are empty
    if isinstance(value, dict):
        cleaned_dict = {}
        for key, val in value.items():
            cleaned_val = _prune_empty_values(val)
            if cleaned_val is not None:
                cleaned_dict[key] = cleaned_val
        return cleaned_dict or None

    # Primitive types (int, float, bool, etc.) – keep as-is
    return value


class PreConsultationTemplateAPIView(APIView):
    """
    Returns pre-consultation template for the authenticated doctor,
    resolving doctor identity from JWT and specialty from the doctor profile.
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def get(self, request):
        user = request.user

        # For development: Always clear cache to ensure template changes are reflected immediately
        # MetadataLoader also checks file modification times, but clearing cache
        # ensures immediate reload without waiting for mtime check
        
        if settings.DEBUG:
            MetadataLoader.clear_cache()

        # Resolve doctor profile from authenticated user
        doctor_profile = getattr(user, "doctor", None)
        if doctor_profile is None:
            return Response(
                {"detail": "Doctor profile not found for this user."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Map doctor specialization to metadata key
        raw_specialty = (doctor_profile.primary_specialization or "").strip()
        specialty_key = raw_specialty.lower().strip()
        
        # Log for debugging
        logger.info(f"Doctor specialty - Raw: '{raw_specialty}', Normalized: '{specialty_key}'")

        try:
            specialty_cfg = MetadataLoader.get("pre_consultation/specialty_config.json")
        except FileNotFoundError:
            logger.error("pre_consultation/specialty_config.json not found")
            return Response(
                {"error": "Pre-consult configuration missing on server."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Log available specialties for debugging
        available_specialties = list(specialty_cfg.keys())
        logger.info(f"Available specialties in config: {available_specialties}")
        
        if specialty_key not in specialty_cfg:
            logger.warning(f"Specialty '{specialty_key}' not found in config. Available: {available_specialties}")
            return Response(
                {
                    "error": f"Pre-consult template not configured for specialty '{specialty_key}'",
                    "available_specialties": available_specialties,
                    "requested_specialty": specialty_key,
                    "raw_specialty": raw_specialty
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        
        # Log the sections configured for this specialty
        specialty_sections = specialty_cfg.get(specialty_key, {}).get("sections", [])
        logger.info(f"Specialty '{specialty_key}' has {len(specialty_sections)} sections configured: {specialty_sections}")

        try:
            logger.info(f"Fetching template for specialty: '{specialty_key}' (raw: '{raw_specialty}')")
            template = ConsultationEngine.get_pre_consultation_template(specialty_key)
            version_info = MetadataLoader.get("_version.json")
            metadata_version = version_info.get("metadata_version")
            
            # Include specialty_config in response for frontend visibility logic
            specialty_config_for_specialty = specialty_cfg.get(specialty_key, {})
            
            # Load specialty-specific ranges for vitals (if available)
            specialty_ranges = None
            try:
                ranges_data = MetadataLoader.get("pre_consultation/vitals/vitals_ranges.json")
                specialty_ranges = ranges_data.get(specialty_key) or ranges_data.get("default")
                logger.debug(f"Loaded specialty ranges for '{specialty_key}': {specialty_ranges is not None}")
            except FileNotFoundError:
                logger.debug("No vitals_ranges.json found, using field defaults")
            except Exception as e:
                logger.warning(f"Error loading specialty ranges: {e}")
            
            # Log template sections for debugging
            template_sections = [s.get("section") for s in template.get("sections", [])]
            logger.info(f"Template returned {len(template_sections)} sections: {template_sections}")
        except FileNotFoundError as e:
            logger.error(f"Metadata file missing: {e}")
            return Response(
                {"error": "Pre-consultation metadata missing on server."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception as e:
            logger.exception("Failed to build pre-consultation template")
            return Response(
                {"error": "Failed to build pre-consultation template."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "specialty": specialty_key,
                "metadata_version": metadata_version,
                "template": template,
                "specialty_config": specialty_config_for_specialty,
                "specialty_ranges": specialty_ranges,  # Include specialty-specific validation ranges
            },
            status=status.HTTP_200_OK,
        )

class CreateEncounterAPIView(APIView):
    """
    Create a new Clinical Encounter for pre-consultation.
    Idempotent: if active encounter exists (including race), returns it with 200; never 409.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def post(self, request):
        """
        Create a new encounter for the selected patient
        """
        return Response(
            {
                "status": False,
                "message": "Doctor encounter creation is disabled. Please create/reuse encounter from helpdesk check-in.",
                "code": "ENCOUNTER_CREATION_HELPDESK_ONLY",
            },
            status=status.HTTP_403_FORBIDDEN,
            content_type="application/json",
        )

        # Legacy implementation retained below for rollback reference.
        try:
            user = request.user
            doctor_profile = getattr(user, "doctor", None)
            if doctor_profile is None:
                return Response({
                    "status": False,
                    "message": "Doctor profile not found for this user."
                }, status=status.HTTP_400_BAD_REQUEST, content_type="application/json")

            patient_profile_id = request.data.get("patient_profile_id")
            if not patient_profile_id:
                return Response({
                    "status": False,
                    "message": "patient_profile_id is required."
                }, status=status.HTTP_400_BAD_REQUEST, content_type="application/json")

            # Validate UUID and resolve patient
            try:
                profile_uuid = uuid.UUID(str(patient_profile_id))
            except (ValueError, TypeError):
                return Response({
                    "status": False,
                    "message": "Invalid patient_profile_id format."
                }, status=status.HTTP_400_BAD_REQUEST, content_type="application/json")

            try:
                patient_profile = PatientProfile.objects.get(id=profile_uuid)
            except PatientProfile.DoesNotExist:
                return Response({
                    "status": False,
                    "message": "Patient not found."
                }, status=status.HTTP_404_NOT_FOUND, content_type="application/json")

            patient_account = getattr(patient_profile, "account", None)
            if not patient_account:
                return Response({
                    "status": False,
                    "message": "Patient profile has no linked account. Cannot create encounter.",
                }, status=status.HTTP_400_BAD_REQUEST, content_type="application/json")

            # Resolve clinic: from request or doctor's first clinic
            clinic_id = request.data.get("clinic_id")
            if clinic_id:
                try:
                    clinic = Clinic.objects.get(id=clinic_id)
                    if not doctor_profile.clinics.filter(pk=clinic.pk).exists():
                        return Response({
                            "status": False,
                            "message": "Doctor is not associated with this clinic."
                        }, status=status.HTTP_400_BAD_REQUEST, content_type="application/json")
                except (ValueError, TypeError):
                    return Response({
                        "status": False,
                        "message": "Invalid clinic_id format."
                    }, status=status.HTTP_400_BAD_REQUEST, content_type="application/json")
                except Clinic.DoesNotExist:
                    return Response({
                        "status": False,
                        "message": "Clinic not found."
                    }, status=status.HTTP_404_NOT_FOUND, content_type="application/json")
            else:
                clinic = doctor_profile.clinics.first()
                if not clinic:
                    return Response({
                        "status": False,
                        "message": "Doctor has no clinic. Provide clinic_id or associate doctor with a clinic."
                    }, status=status.HTTP_400_BAD_REQUEST, content_type="application/json")

            if not getattr(clinic, "code", None) or not str(clinic.code).strip():
                return Response({
                    "status": False,
                    "message": "Clinic has no business code set. Please complete clinic setup (code is required for visit PNR)."
                }, status=status.HTTP_400_BAD_REQUEST, content_type="application/json")

            # Get or create encounter (reuse active encounter for same patient+clinic). Idempotent.
            try:
                with transaction.atomic():
                    encounter, created = EncounterService.get_or_create_encounter(
                        clinic=clinic,
                        patient_account=patient_account,
                        patient_profile=patient_profile,
                        doctor=doctor_profile,
                        encounter_type="walk_in",
                        entry_mode="doctor",
                        created_by=user
                    )
            except IntegrityError as e:
                # Idempotent: active encounter already exists (e.g. race). Return it in a fresh transaction; never 409.
                err_str = (str(e) or "Database constraint error")[:500]
                logger.warning("IntegrityError creating encounter (returning existing): %s", err_str)
                with transaction.atomic():
                    existing = EncounterService.get_active_encounter(patient_account, clinic)
                if existing:
                    return Response({
                        "status": True,
                        "message": "Existing active encounter returned.",
                        "created": False,
                        "data": {
                            "encounter_id": str(existing.id),
                            "visit_pnr": existing.visit_pnr or "",
                            "status": existing.status,
                            "created_at": existing.created_at.isoformat()
                        }
                    }, status=status.HTTP_200_OK, content_type="application/json")
                return Response({
                    "status": False,
                    "message": "A visit may already exist for this patient. Please refresh the page and try again.",
                    "detail": err_str,
                    "error": err_str
                }, status=status.HTTP_409_CONFLICT, content_type="application/json")

            return Response({
                "status": True,
                "message": "Encounter created successfully." if created else "Existing active encounter returned.",
                "created": created,
                "data": {
                    "encounter_id": str(encounter.id),
                    "visit_pnr": encounter.visit_pnr or "",
                    "status": encounter.status,
                    "created_at": encounter.created_at.isoformat()
                }
            }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK, content_type="application/json")

        except Http404:
            return Response({
                "status": False,
                "message": "Patient not found."
            }, status=status.HTTP_404_NOT_FOUND, content_type="application/json")
        except ValueError as e:
            return Response({
                "status": False,
                "message": str(e) or "Invalid request.",
                "error": str(e) or "Invalid request."
            }, status=status.HTTP_400_BAD_REQUEST, content_type="application/json")
        except DjangoValidationError as e:
            msgs = getattr(e, "messages", None)
            err_msg = "; ".join(str(m) for m in msgs) if msgs else str(e)
            return Response({
                "status": False,
                "message": err_msg or "Validation error.",
                "error": err_msg or "Validation error."
            }, status=status.HTTP_400_BAD_REQUEST, content_type="application/json")
        except Exception as e:
            logger.exception("Error creating encounter: %s", e)
            err_msg = (str(e) or "Unknown error")[:500]
            return Response({
                "status": False,
                "message": f"Failed to create encounter: {err_msg}",
                "detail": err_msg,
                "error": err_msg
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR, content_type="application/json")


def _resolve_patient_and_clinic_for_entry(request):
    """
    Resolve patient_profile, patient_account, and clinic from request (patient_profile_id, optional clinic_id).
    Returns (patient_profile, patient_account, clinic) or (None, None, None) with a Response to return.
    """
    user = request.user
    doctor_profile = getattr(user, "doctor", None)
    if doctor_profile is None:
        return None, None, None, Response(
            {"detail": "Doctor profile not found for this user."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    patient_profile_id = request.data.get("patient_profile_id")
    if not patient_profile_id:
        return None, None, None, Response(
            {"detail": "patient_profile_id is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        profile_uuid = uuid.UUID(str(patient_profile_id))
    except (ValueError, TypeError):
        return None, None, None, Response(
            {"detail": "Invalid patient_profile_id format."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        patient_profile = PatientProfile.objects.get(id=profile_uuid)
    except PatientProfile.DoesNotExist:
        return None, None, None, Response(
            {"detail": "Patient not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
    patient_account = patient_profile.account
    clinic_id = request.data.get("clinic_id")
    if clinic_id:
        try:
            clinic = Clinic.objects.get(id=clinic_id)
            if not doctor_profile.clinics.filter(pk=clinic.pk).exists():
                return None, None, None, Response(
                    {"detail": "Doctor is not associated with this clinic."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except (ValueError, TypeError):
            return None, None, None, Response(
                {"detail": "Invalid clinic_id format."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Clinic.DoesNotExist:
            return None, None, None, Response(
                {"detail": "Clinic not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
    else:
        clinic = doctor_profile.clinics.first()
        if not clinic:
            return None, None, None, Response(
                {"detail": "Doctor has no clinic. Provide clinic_id or associate doctor with a clinic."},
                status=status.HTTP_400_BAD_REQUEST,
            )
    return patient_profile, patient_account, clinic, None


class EntryResolveAPIView(APIView):
    """
    POST /consultations/entry/resolve/
    Returns entry_state: active | completed | none. Does not create an encounter.
    Body: { "patient_profile_id": "<uuid>", "clinic_id": "<uuid>" (optional) }
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def post(self, request):
        patient_profile, patient_account, clinic, err_response = _resolve_patient_and_clinic_for_entry(request)
        if err_response is not None:
            return err_response
        active = EncounterService.get_active_encounter(patient_account, clinic)
        if active:
            redirect_to = (
                "consultation"
                if normalize_encounter_status(active.status) == "consultation_in_progress"
                else "pre"
            )
            return Response(
                {
                    "entry_state": "active",
                    "encounter": {
                        "id": str(active.id),
                        "visit_pnr": active.visit_pnr or "",
                        "status": _status_for_api(active.status),
                        "created_at": active.created_at.isoformat(),
                    },
                    "redirect_to": redirect_to,
                },
                status=status.HTTP_200_OK,
            )
        last = (
            ClinicalEncounter.objects.filter(
                patient_account=patient_account,
                clinic=clinic,
            )
            .order_by("-updated_at")
            .first()
        )
        if last and last.status in ("consultation_completed", "closed", "cancelled"):
            return Response(
                {"entry_state": "completed", "encounter": None},
                status=status.HTTP_200_OK,
            )
        return Response(
            {"entry_state": "none"},
            status=status.HTTP_200_OK,
        )


class StartNewVisitAPIView(APIView):
    """
    POST /consultations/entry/start-new-visit/
    If an active encounter exists: transition it to consultation_completed or cancelled, then create new.
    Returns new encounter_id and redirect_url to pre-consultation.
    Body: { "patient_profile_id": "<uuid>", "clinic_id": "<uuid>" (optional) }
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    @transaction.atomic
    def post(self, request):
        print("Start new visit called at:", timezone.now())
        patient_profile, patient_account, clinic, err_response = _resolve_patient_and_clinic_for_entry(request)
        if err_response is not None:
            return err_response
        if not getattr(clinic, "code", None) or not str(clinic.code).strip():
            return Response(
                {"detail": "Clinic has no business code set. Please complete clinic setup (code is required for visit PNR)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = request.user
        doctor_profile = getattr(user, "doctor", None)
        # Step 1: Lock and fetch any active encounter (prevents race, ensures safe auto-close before create)
        active = ClinicalEncounter.objects.filter(
            patient_account=patient_account,
            clinic=clinic,
            is_active=True,
        ).select_for_update().first()
        if active:
            if active.status == "consultation_in_progress":
                try:
                    consultation = active.consultation
                    if not consultation.is_finalized:
                        if not consultation.ended_at:
                            consultation.ended_at = timezone.now()
                            consultation.save(update_fields=["ended_at"])
                        EncounterStateMachine.complete_consultation(active, user=user)
                        consultation.refresh_from_db()
                        if not consultation.is_finalized:
                            consultation.is_finalized = True
                            consultation.save(update_fields=["is_finalized"])
                except Consultation.DoesNotExist:
                    EncounterStateMachine.complete_consultation(active, user=user)
            elif active.status in ("created", "pre_consultation_in_progress", "pre_consultation_completed"):
                EncounterStateMachine.cancel(active, user=user)
            # Safeguard: ensure closed encounter is not still active (unique constraint)
            active.refresh_from_db()
            if active.is_active:
                ClinicalEncounter.objects.filter(pk=active.pk).update(
                    is_active=False,
                    updated_at=timezone.now(),
                )
        # Step 2: Create in nested atomic so IntegrityError only rolls back the create;
        # then we can safely fetch existing encounter in the still-valid outer transaction.
        try:
            with transaction.atomic():
                new_encounter = EncounterService.create_encounter(
                    clinic=clinic,
                    patient_account=patient_account,
                    patient_profile=patient_profile,
                    doctor=doctor_profile,
                    encounter_type="walk_in",
                    entry_mode="doctor",
                    created_by=user,
                    consultation_type="FULL",
                )
        except IntegrityError:
            existing = ClinicalEncounter.objects.filter(
                patient_account=patient_account,
                clinic=clinic,
                is_active=True,
            ).first()

            if existing:
                return Response(
                    {
                        "encounter_id": str(existing.id),
                        "visit_pnr": existing.visit_pnr or "",
                        "status": _status_for_api(existing.status),
                        "redirect_url": f"/consultations/pre-consultation?encounter_id={existing.id}",
                        "message": "Existing active encounter returned.",
                    },
                    status=status.HTTP_200_OK,
                )

            return Response(
                {
                    "detail": "An active visit already exists for this patient. Please refresh and try again.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        return Response(
            {
                "encounter_id": str(new_encounter.id),
                "visit_pnr": new_encounter.visit_pnr or "",
                "status": _status_for_api(new_encounter.status),
                "redirect_url": f"/consultations/pre-consultation?encounter_id={new_encounter.id}",
            },
            status=status.HTTP_201_CREATED,
        )


class PreConsultationSectionAPIView(APIView):
    """
    Generic API for saving/retrieving pre-consultation sections.
    Supports: vitals, chief_complaint, allergies, medical_history
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def get_encounter(self, encounter_id):
        """Get encounter or raise 404"""
        return get_object_or_404(ClinicalEncounter, id=encounter_id)

    def get_preconsultation(self, encounter):
        """Get or create pre-consultation for encounter"""
        try:
            if hasattr(encounter, "pre_consultation"):
                pc = encounter.pre_consultation
                return pc
        except PreConsultation.DoesNotExist:
            pass
        # May exist in DB from a concurrent request
        pc = PreConsultation.objects.filter(encounter=encounter).first()
        if pc is not None:
            return pc

        # Get doctor specialty for template
        doctor = encounter.doctor
        if not doctor:
            raise ValueError("Encounter must have a doctor to create pre-consultation")
        
        specialty_code = (doctor.primary_specialization or "").strip().lower()
        if not specialty_code:
            raise ValueError("Doctor must have a specialty")
        
        return PreConsultationService.create_preconsultation(
            encounter=encounter,
            specialty_code=specialty_code,
            template_version="v1",
            entry_mode="doctor",
            created_by=self.request.user
        )

    def get(self, request, encounter_id, section_code):
        """
        Retrieve section data for a pre-consultation
        Auto-creates pre-consultation if it doesn't exist
        """
        encounter = self.get_encounter(encounter_id)
        if encounter.status in ("cancelled", "no_show"):
            return Response(
                {"detail": MSG_VISIT_CANCELLED},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Get or create pre-consultation (same logic as POST)
        try:
            preconsultation = encounter.pre_consultation
        except PreConsultation.DoesNotExist:
            # May exist in DB from a concurrent request; avoid duplicate key on create
            preconsultation = PreConsultation.objects.filter(encounter=encounter).first()
            if preconsultation is None:
                try:
                    preconsultation = self.get_preconsultation(encounter)
                except PreConsultationAlreadyExistsError as e:
                    # Race: another request created it; transaction is aborted — rollback and fetch existing
                    transaction.rollback()
                    preconsultation = PreConsultation.objects.get(encounter=e.encounter)

        if section_code not in SECTION_MODEL_MAP:
            return Response({
                "status": False,
                "message": f"Invalid section code: {section_code}"
            }, status=status.HTTP_400_BAD_REQUEST)

        section_model = SECTION_MODEL_MAP[section_code]
        
        try:
            section_obj = section_model.objects.get(pre_consultation=preconsultation)
            payload = section_obj.data
            if section_code == "vitals":
                payload = _vitals_data_for_api(payload)
            return Response({
                "status": True,
                "message": f"{section_code} retrieved successfully.",
                "data": payload
            }, status=status.HTTP_200_OK)
        except section_model.DoesNotExist:
            return Response({
                "status": True,
                "message": f"{section_code} not found.",
                "data": None
            }, status=status.HTTP_200_OK)

    @transaction.atomic
    def post(self, request, encounter_id, section_code):
        """
        Save or update section data (idempotent)
        """
        encounter = self.get_encounter(encounter_id)
        if encounter.status in ("cancelled", "no_show"):
            return Response(
                {"detail": MSG_VISIT_CANCELLED},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if encounter.status in ("consultation_in_progress", "consultation_completed", "closed"):
            return Response(
                {"detail": "Pre-consultation is read-only; consultation has started or encounter is locked."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if section_code not in SECTION_MODEL_MAP:
            return Response({
                "status": False,
                "message": f"Invalid section code: {section_code}"
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            preconsultation = self.get_preconsultation(encounter)
        except PreConsultationAlreadyExistsError as e:
            transaction.rollback()
            preconsultation = PreConsultation.objects.get(encounter=e.encounter)
        except ValueError as e:
            return Response({
                "status": False,
                "message": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

        section_model = SECTION_MODEL_MAP[section_code]
        data = request.data.get("data", {})

        try:
            section_obj = PreConsultationSectionService.upsert_section(
                section_model=section_model,
                preconsultation=preconsultation,
                data=data,
                user=request.user,
                schema_version="v1"
            )

            return Response({
                "status": True,
                "message": f"{section_code} saved successfully.",
                "data": section_obj.data
            }, status=status.HTTP_200_OK)

        except DjangoValidationError as e:
            msg = getattr(e, "message", None) or (getattr(e, "messages", None) and "; ".join(str(m) for m in e.messages)) or str(e)
            return Response({
                "status": False,
                "message": msg or "Validation error."
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception(f"Error saving {section_code}")
            return Response({
                "status": False,
                "message": f"Failed to save {section_code}.",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PreConsultationPreviewAPIView(APIView):
    """
    Aggregated, read-only preview for pre-consultation.

    GET /consultations/pre-consultation/preview/?encounter_id=<uuid>

    - Returns only non-empty sections in clinical order.
    - If all sections are empty or no pre-consultation exists, returns:
        { "message": "NO_PRECONSULT_DATA" }
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    _CLINICAL_ORDER = [
        "chief_complaint",
        "vitals",
        "allergies",
        "medical_history",
    ]

    def get(self, request):
        encounter_id = request.query_params.get("encounter_id")
        if not encounter_id:
            return Response(
                {"detail": "encounter_id query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            uuid.UUID(str(encounter_id))
        except (ValueError, TypeError):
            return Response(
                {"detail": "Invalid encounter_id format."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        encounter = get_object_or_404(ClinicalEncounter, id=encounter_id)

        if encounter.status in ("cancelled", "no_show"):
            return Response(
                {"detail": MSG_VISIT_CANCELLED},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            preconsultation = encounter.pre_consultation
        except PreConsultation.DoesNotExist:
            preconsultation = PreConsultation.objects.filter(encounter=encounter).first()
            if preconsultation is None:
                return Response(
                    {"message": "NO_PRECONSULT_DATA"},
                    status=status.HTTP_200_OK,
                )

        ordered_payload = OrderedDict()

        for section_code in self._CLINICAL_ORDER:
            section_model = SECTION_MODEL_MAP.get(section_code)
            if section_model is None:
                continue

            try:
                section_obj = section_model.objects.get(pre_consultation=preconsultation)
            except section_model.DoesNotExist:
                continue

            cleaned = _prune_empty_values(section_obj.data)
            if cleaned is None:
                continue

            ordered_payload[section_code] = cleaned

        if not ordered_payload:
            return Response(
                {"message": "NO_PRECONSULT_DATA"},
                status=status.HTTP_200_OK,
            )

        # Meta information for footer / audit
        filled_by_user = None
        if preconsultation.created_by is not None:
            name = getattr(preconsultation.created_by, "get_full_name", None)
            if callable(name):
                filled_by_user = preconsultation.created_by.get_full_name() or None
            if not filled_by_user:
                filled_by_user = getattr(preconsultation.created_by, "username", None)

        meta = {
            "entry_mode": preconsultation.get_entry_mode_display()
            if hasattr(preconsultation, "get_entry_mode_display")
            else preconsultation.entry_mode,
            "filled_by": filled_by_user,
            "last_updated": preconsultation.updated_at.isoformat()
            if getattr(preconsultation, "updated_at", None)
            else None,
        }

        response_payload = OrderedDict()
        for key, val in ordered_payload.items():
            response_payload[key] = val
        response_payload["meta"] = meta

        return Response(response_payload, status=status.HTTP_200_OK)


class PreConsultationPreviousRecordsAPIView(APIView):
    """
    Fetch previous pre-consultation records for a patient
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def get(self, request, patient_id):
        """
        Get all previous pre-consultation records for a patient
        """
        try:
            # Normalize patient_id to UUID (path converter may pass UUID or str)
            try:
                patient_uuid = uuid.UUID(str(patient_id)) if patient_id else None
            except (ValueError, TypeError):
                return Response({
                    "status": False,
                    "message": "Invalid patient ID format."
                }, status=status.HTTP_400_BAD_REQUEST)
            if not patient_uuid:
                return Response({
                    "status": False,
                    "message": "Patient ID is required."
                }, status=status.HTTP_400_BAD_REQUEST)

            try:
                patient_profile = PatientProfile.objects.get(id=patient_uuid)
            except PatientProfile.DoesNotExist:
                return Response({
                    "status": False,
                    "message": "Patient not found."
                }, status=status.HTTP_404_NOT_FOUND)

            # Get all encounters for this patient with pre-consultations
            encounters = ClinicalEncounter.objects.filter(
                patient_profile=patient_profile,
                pre_consultation__isnull=False
            ).select_related("pre_consultation").prefetch_related(
                "pre_consultation__preconsultationvitals",
                "pre_consultation__preconsultationchiefcomplaint",
                "pre_consultation__preconsultationallergies",
                "pre_consultation__preconsultationmedicalhistory"
            ).order_by("-created_at")[:10]  # Last 10 records

            records = []
            for encounter in encounters:
                preconsultation = encounter.pre_consultation
                record = {
                    "encounter_id": str(encounter.id),
                    "visit_pnr": encounter.visit_pnr or "",
                    "created_at": preconsultation.created_at.isoformat(),
                    "completed_at": preconsultation.completed_at.isoformat() if preconsultation.completed_at else None,
                    "sections": {}
                }

                # Get all section data
                for section_code, section_model in SECTION_MODEL_MAP.items():
                    try:
                        section_obj = section_model.objects.get(pre_consultation=preconsultation)
                        record["sections"][section_code] = section_obj.data
                    except section_model.DoesNotExist:
                        pass

                records.append(record)

            return Response({
                "status": True,
                "message": "Previous records retrieved successfully.",
                "data": records
            }, status=status.HTTP_200_OK)

        except Http404:
            return Response({
                "status": False,
                "message": "Patient not found."
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.exception("Error fetching previous records")
            err_msg = str(e) if e else "Unknown error"
            return Response({
                "status": False,
                "message": "Failed to fetch previous records.",
                "error": err_msg
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR, content_type="application/json")


# =====================================================
# ENCOUNTER LIFECYCLE & REDIRECT APIs
# =====================================================

def _status_for_api(encounter_status: str) -> str:
    """Return API-facing status (UPPERCASE with underscores)."""
    return encounter_status_for_api(encounter_status)


class StartPreConsultationAPIView(APIView):
    """
    POST /encounters/{id}/pre-consultation/start/
    Transitions CREATED -> PRE_CONSULTATION_IN_PROGRESS.
    Idempotent: if already in/last pre-consultation (or legacy pre_consultation), returns 200.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    # Statuses where "start pre-consultation" is a no-op (already started or past)
    _ALREADY_STARTED_OR_PAST = frozenset({
        "pre_consultation_in_progress",
        "pre_consultation_completed",
        "consultation_in_progress",
        "consultation_completed",
        "closed",
        "pre_consultation",  # legacy
        "in_consultation",   # legacy
        "completed",         # legacy
    })

    def post(self, request, encounter_id):
        encounter = get_object_or_404(ClinicalEncounter, id=encounter_id)
        if encounter.status in self._ALREADY_STARTED_OR_PAST:
            return Response(
                {
                    "encounter_id": str(encounter.id),
                    "status": _status_for_api(encounter.status),
                    "message": "Pre-consultation already in progress or completed.",
                },
                status=status.HTTP_200_OK,
            )
        if encounter.status in ("cancelled", "no_show"):
            return Response(
                {"detail": MSG_VISIT_CANCELLED},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if encounter.status != "created":
            return Response(
                {"detail": f"Encounter must be in CREATED state. Current: {encounter.status}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            EncounterStateMachine.start_pre_consultation(encounter, user=request.user)
        except DjangoValidationError as e:
            return Response(
                {"detail": str(e) or "Invalid transition."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {
                "encounter_id": str(encounter.id),
                "status": _status_for_api(encounter.status),
                "message": "Pre-consultation started.",
            },
            status=status.HTTP_200_OK,
        )


class CompletePreConsultationAPIView(APIView):
    """
    POST /encounters/{id}/pre-consultation/complete/
    Validates required fields, marks pre_consultation complete, updates encounter,
    returns redirect metadata. Use transaction.atomic().
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    @transaction.atomic
    def post(self, request, encounter_id):
        encounter = get_object_or_404(ClinicalEncounter, id=encounter_id)
        if encounter.status in ("cancelled", "no_show"):
            return Response(
                {"detail": MSG_VISIT_CANCELLED},
                status=status.HTTP_400_BAD_REQUEST,
            )
        redirect_url = f"/consultations/consultation/{encounter.id}"

        # Idempotent: already completed, or created (doctor can go straight to consultation) → return 200 with redirect
        if encounter.status in (
            "created",
            "pre_consultation_completed",
            "consultation_in_progress",
            "consultation_completed",
            "closed",
            "pre_consultation",  # legacy
            "in_consultation",
            "completed",
        ):
            return Response(
                {
                    "encounter_id": str(encounter.id),
                    "status": _status_for_api(encounter.status),
                    "next_step": "CONSULTATION",
                    "redirect_url": redirect_url,
                },
                status=status.HTTP_200_OK,
            )

        if encounter.status not in ("pre_consultation_in_progress",):
            return Response(
                {"detail": f"Cannot complete pre-consultation. Current: {encounter.status}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            preconsultation = encounter.pre_consultation
        except PreConsultation.DoesNotExist:
            return Response(
                {"detail": "Pre-consultation record not found for this encounter."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if preconsultation.is_locked:
            return Response(
                {"detail": "Pre-consultation is already locked."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        PreConsultationService.mark_completed(preconsultation, user=request.user)
        EncounterStateMachine.complete_pre_consultation(encounter, user=request.user)
        return Response(
            {
                "encounter_id": str(encounter.id),
                "status": _status_for_api(encounter.status),
                "next_step": "CONSULTATION",
                "redirect_url": redirect_url,
            },
            status=status.HTTP_200_OK,
        )


class EncounterDetailAPIView(APIView):
    """
    GET /encounters/{id}/
    Returns encounter detail for consultation page (status, timestamps, etc.).
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def get(self, request, encounter_id):
        encounter = get_object_or_404(ClinicalEncounter, id=encounter_id)
        consultation = Consultation.objects.filter(encounter=encounter).only("id").first()
        payload = {
            "id": str(encounter.id),
            "consultation_id": str(consultation.id) if consultation else None,
            "visit_pnr": encounter.visit_pnr or "",
            "status": _status_for_api(encounter.status),
            "check_in_time": encounter.check_in_time.isoformat() if encounter.check_in_time else None,
            "consultation_start_time": encounter.consultation_start_time.isoformat() if encounter.consultation_start_time else None,
            "consultation_end_time": encounter.consultation_end_time.isoformat() if encounter.consultation_end_time else None,
            "closed_at": encounter.closed_at.isoformat() if encounter.closed_at else None,
            "created_at": encounter.created_at.isoformat(),
            "cancelled": encounter.status == "cancelled",
            "cancelled_at": encounter.cancelled_at.isoformat() if getattr(encounter, "cancelled_at", None) else None,
            "cancelled_by": str(encounter.cancelled_by_id) if (getattr(encounter, "cancelled_by_id", None) is not None and encounter.cancelled_by_id) else None,
        }
        return Response(payload, status=status.HTTP_200_OK)


class StartConsultationAPIView(APIView):
    """
    POST /encounters/{id}/consultation/start/
    Idempotent, state-aware: if already CONSULTATION_IN_PROGRESS returns 200.
    If CREATED or PRE_*: ensures PreConsultation exists, marks is_skipped if not completed, then starts.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def post(self, request, encounter_id):
        def bad_request(detail, message=None):
            return Response(
                {"detail": detail, "message": message or detail},
                status=status.HTTP_400_BAD_REQUEST,
                content_type="application/json",
            )
        try:
            result = start_consultation_for_encounter(
                encounter_id=encounter_id,
                user=request.user,
                source="doctor",
            )
        except ClinicalEncounter.DoesNotExist:
            return bad_request("Encounter not found or invalid.", "Cannot start consultation.")
        except DjangoValidationError as e:
            return bad_request(str(e) or "Invalid state for consultation.")
        except Exception as e:
            logger.exception("StartConsultation start service failed: %s", e)
            return Response(
                {"detail": str(e) or "Failed to start consultation.", "message": str(e) or "Failed to start consultation."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content_type="application/json",
            )

        encounter = result.encounter
        return Response(
            {
                "encounter_id": str(encounter.id),
                "consultation_id": str(result.consultation.id),
                "status": _status_for_api(encounter.status),
                "already_started": result.already_started,
                "source": "doctor",
                "next_step": "CONSULTATION",
                "redirect_url": f"/consultations/start-consultation?encounter_id={encounter.id}",
            },
            status=status.HTTP_200_OK,
        )


class EndConsultationAPIView(APIView):
    """
    POST /consultations/encounter/<uuid:encounter_id>/consultation/complete/
    Ends the consultation: sets consultation.ended_at, is_finalized, and transitions
    encounter to CONSULTATION_COMPLETED. Returns redirect_url for frontend.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def _error_response(self, message, *, errors=None, status_code=status.HTTP_400_BAD_REQUEST):
        return Response(
            _contract_error(message, errors=errors),
            status=status_code,
        )

    @transaction.atomic
    def post(self, request, encounter_id):
        encounter = get_object_or_404(ClinicalEncounter, id=encounter_id)
        if encounter.status in ("cancelled", "no_show"):
            return self._error_response(
                MSG_VISIT_CANCELLED,
                errors={"encounter": [MSG_VISIT_CANCELLED]},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if encounter.status != "consultation_in_progress":
            msg = f"Cannot end consultation. Encounter must be in CONSULTATION_IN_PROGRESS. Current: {encounter.status}."
            return self._error_response(
                msg,
                errors={"encounter": [msg]},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        try:
            consultation = encounter.consultation
        except Consultation.DoesNotExist:
            msg = "Consultation record not found for this encounter."
            return self._error_response(
                msg,
                errors={"consultation": [msg]},
                status_code=status.HTTP_404_NOT_FOUND,
            )
        if consultation.is_finalized:
            msg = "Consultation already ended."
            return self._error_response(
                msg,
                errors={"consultation": [msg]},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if not consultation.ended_at:
            consultation.ended_at = timezone.now()
            consultation.save(update_fields=["ended_at"])

        try:
            persist_consultation_end_state(
                consultation=consultation,
                payload=request.data,
                user=request.user,
            )
        except DjangoValidationError as e:
            msgs = list(getattr(e, "messages", []) or [])
            errors = {}
            if not msgs and hasattr(e, "message_dict"):
                for _, values in getattr(e, "message_dict", {}).items():
                    if isinstance(values, (list, tuple)):
                        msgs.extend([str(v) for v in values if str(v).strip()])
                    elif values:
                        msgs.append(str(values))
            if hasattr(e, "message_dict"):
                for key, values in getattr(e, "message_dict", {}).items():
                    if isinstance(values, (list, tuple)):
                        errors[key] = [str(v) for v in values if str(v).strip()]
                    elif values:
                        errors[key] = [str(values)]
            if not msgs:
                raw = str(e).strip()
                if raw:
                    msgs = [raw]
            detail = "; ".join(msgs) if msgs else "Validation failed while ending consultation."
            logger.warning(
                "EndConsultation validation error encounter=%s detail=%s diagnoses=%s",
                encounter_id,
                detail,
                request.data.get("diagnoses", []),
            )
            return self._error_response(
                "Validation failed",
                errors=errors or {"non_field_errors": [detail]},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        except IntegrityError:
            msg = "Duplicate symptom conflict while saving consultation. Please retry once."
            return self._error_response(
                "Validation failed",
                errors={"symptoms": [msg]},
                status_code=status.HTTP_409_CONFLICT,
            )

        EncounterStateMachine.complete_consultation(encounter, user=request.user)
        encounter.refresh_from_db()
        # Safeguard: terminal state must have is_active=False (prevents zombie active encounter / unique constraint)
        if encounter.is_active:
            ClinicalEncounter.objects.filter(pk=encounter.pk).update(
                is_active=False,
                updated_at=timezone.now(),
            )
            encounter.refresh_from_db()
        consultation.refresh_from_db()
        if not consultation.is_finalized:
            consultation.is_finalized = True
            consultation.save(update_fields=["is_finalized"])

        return Response(
            {
                "status": "success",
                "redirect_url": "/doctor-dashboard",
            },
            status=status.HTTP_200_OK,
        )


class CancelEncounterAPIView(APIView):
    """
    POST /consultations/encounter/<uuid:encounter_id>/cancel/

    Transitions encounter to CANCELLED so the doctor can start a new encounter for the same patient.
    Required for state machine integrity: when user cancels (or backs out of) a consultation,
    the encounter must leave consultation_in_progress and become cancelled. Otherwise the next
    start_consultation call would correctly reject with 400 (already in progress).

    Allowed transitions: any allowed state → cancelled (e.g. consultation_in_progress → cancelled).
    Sets: status=cancelled, cancelled_at=now, cancelled_by=request.user, is_active=False.
    Idempotent: if already cancelled, returns 200.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def post(self, request, encounter_id):
        encounter = get_object_or_404(ClinicalEncounter, id=encounter_id)
        if encounter.status == "cancelled":
            return Response(
                {"detail": "Encounter already cancelled.", "status": "cancelled"},
                status=status.HTTP_200_OK,
            )
        try:
            # Required for state integrity: transition to cancelled and set cancelled_at, cancelled_by
            # so the encounter leaves consultation_in_progress and user can start a new visit.
            EncounterStateMachine.cancel(encounter, user=request.user)
        except DjangoValidationError as e:
            return Response(
                {"detail": str(e) or "Cannot cancel this encounter."},
                status=status.HTTP_400_BAD_REQUEST,
                content_type="application/json",
            )
        encounter.refresh_from_db()
        # Safeguard: terminal state must have is_active=False (prevents zombie active encounter / unique constraint)
        if encounter.status != "cancelled":
            logger.warning(
                "CancelEncounterAPIView: encounter %s status after cancel was %s, expected cancelled",
                encounter_id,
                encounter.status,
            )
        if encounter.is_active:
            ClinicalEncounter.objects.filter(pk=encounter.pk).update(
                is_active=False,
                updated_at=timezone.now(),
            )
            encounter.refresh_from_db()
        return Response(
            {"detail": "Encounter cancelled.", "status": _status_for_api(encounter.status)},
            status=status.HTTP_200_OK,
        )

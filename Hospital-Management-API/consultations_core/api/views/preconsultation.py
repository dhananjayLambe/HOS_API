# Standard Library Imports
import io
import logging
import os
import uuid
from datetime import datetime
from django.conf import settings
from rest_framework.permissions import (
 IsAuthenticated
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
# Local App Imports
from account.permissions import IsDoctor
from consultations_core.services.consultation_engine import ConsultationEngine
from consultations_core.services.metadata_loader import MetadataLoader
from consultations_core.services.preconsultation_service import PreConsultationService
from consultations_core.services.preconsultation_section_service import PreConsultationSectionService
from consultations_core.services.encounter_service import EncounterService
from patient_account.models import PatientProfile
from clinic.models import Clinic

from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.models.pre_consultation import(
     PreConsultation, 
     PreConsultationVitals, 
     PreConsultationChiefComplaint,
     PreConsultationAllergies, 
     PreConsultationMedicalHistory
)


logger = logging.getLogger(__name__)
# =====================================================
# PRE-CONSULTATION SECTION APIs
# =====================================================

SECTION_MODEL_MAP = {
    "vitals": PreConsultationVitals,
    "chief_complaint": PreConsultationChiefComplaint,
    "allergies": PreConsultationAllergies,
    "medical_history": PreConsultationMedicalHistory,
}

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
    Create a new Clinical Encounter for pre-consultation
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]
    print("CreateEncounterAPIView")
    @transaction.atomic
    def post(self, request):
        """
        Create a new encounter for the selected patient
        """
        try:
            user = request.user
            doctor_profile = getattr(user, "doctor", None)
            if doctor_profile is None:
                return Response({
                    "status": False,
                    "message": "Doctor profile not found for this user."
                }, status=status.HTTP_400_BAD_REQUEST)

            patient_profile_id = request.data.get("patient_profile_id")
            if not patient_profile_id:
                return Response({
                    "status": False,
                    "message": "patient_profile_id is required."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Validate UUID and resolve patient
            try:
                profile_uuid = uuid.UUID(str(patient_profile_id))
            except (ValueError, TypeError):
                return Response({
                    "status": False,
                    "message": "Invalid patient_profile_id format."
                }, status=status.HTTP_400_BAD_REQUEST)

            try:
                patient_profile = PatientProfile.objects.get(id=profile_uuid)
            except PatientProfile.DoesNotExist:
                return Response({
                    "status": False,
                    "message": "Patient not found."
                }, status=status.HTTP_404_NOT_FOUND)

            patient_account = patient_profile.account

            # Resolve clinic: from request or doctor's first clinic
            clinic_id = request.data.get("clinic_id")
            if clinic_id:
                try:
                    clinic = Clinic.objects.get(id=clinic_id)
                    if not doctor_profile.clinics.filter(pk=clinic.pk).exists():
                        return Response({
                            "status": False,
                            "message": "Doctor is not associated with this clinic."
                        }, status=status.HTTP_400_BAD_REQUEST)
                except (ValueError, TypeError):
                    return Response({
                        "status": False,
                        "message": "Invalid clinic_id format."
                    }, status=status.HTTP_400_BAD_REQUEST)
                except Clinic.DoesNotExist:
                    return Response({
                        "status": False,
                        "message": "Clinic not found."
                    }, status=status.HTTP_404_NOT_FOUND)
            else:
                clinic = doctor_profile.clinics.first()
                if not clinic:
                    return Response({
                        "status": False,
                        "message": "Doctor has no clinic. Provide clinic_id or associate doctor with a clinic."
                    }, status=status.HTTP_400_BAD_REQUEST)

            if not getattr(clinic, "code", None) or not str(clinic.code).strip():
                return Response({
                    "status": False,
                    "message": "Clinic has no business code set. Please complete clinic setup (code is required for visit PNR)."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Create encounter
            encounter = EncounterService.create_encounter(
                clinic=clinic,
                patient_account=patient_account,
                patient_profile=patient_profile,
                doctor=doctor_profile,
                encounter_type="walk_in",
                entry_mode="doctor",
                created_by=user
            )

            return Response({
                "status": True,
                "message": "Encounter created successfully.",
                "data": {
                    "encounter_id": str(encounter.id),
                    "visit_pnr": encounter.visit_pnr or "",
                    "status": encounter.status,
                    "created_at": encounter.created_at.isoformat()
                }
            }, status=status.HTTP_201_CREATED)

        except IntegrityError as e:
            logger.exception("IntegrityError creating encounter")
            err_msg = (str(e) or "Database constraint error")[:500]
            return Response({
                "status": False,
                "message": f"Failed to create encounter: {err_msg}",
                "error": err_msg
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR, content_type="application/json")
        except Http404:
            return Response({
                "status": False,
                "message": "Patient not found."
            }, status=status.HTTP_404_NOT_FOUND)
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
            logger.exception("Error creating encounter")
            err_msg = (str(e) or "Unknown error")[:500]
            return Response({
                "status": False,
                "message": f"Failed to create encounter: {err_msg}",
                "error": err_msg
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR, content_type="application/json")


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
        if hasattr(encounter, "pre_consultation"):
            return encounter.pre_consultation
        
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
        
        # Get or create pre-consultation (same logic as POST)
        try:
            preconsultation = encounter.pre_consultation
        except PreConsultation.DoesNotExist:
            # Auto-create pre-consultation if it doesn't exist
            preconsultation = self.get_preconsultation(encounter)

        if section_code not in SECTION_MODEL_MAP:
            return Response({
                "status": False,
                "message": f"Invalid section code: {section_code}"
            }, status=status.HTTP_400_BAD_REQUEST)

        section_model = SECTION_MODEL_MAP[section_code]
        
        try:
            section_obj = section_model.objects.get(pre_consultation=preconsultation)
            return Response({
                "status": True,
                "message": f"{section_code} retrieved successfully.",
                "data": section_obj.data
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
        
        if section_code not in SECTION_MODEL_MAP:
            return Response({
                "status": False,
                "message": f"Invalid section code: {section_code}"
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            preconsultation = self.get_preconsultation(encounter)
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

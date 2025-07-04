# Standard Library Imports
import io
import logging
import os
from datetime import datetime

# Third-Party Imports
from reportlab.lib.colors import black
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, inch
from reportlab.platypus import (
    Paragraph,SimpleDocTemplate, Spacer, Table, TableStyle
)
from rest_framework import generics, permissions, status, views,viewsets
from rest_framework.exceptions import NotFound
from rest_framework.permissions import (
    AllowAny, IsAuthenticated
)
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication


# Django Imports
from django.conf import settings
from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from django.db import transaction
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.views.decorators.csrf import csrf_exempt

# Local App Imports
from account.permissions import IsDoctor, IsDoctorOrHelpdeskOrOwnerOrAdmin
from consultations.models import (
    Advice, AdviceTemplate, Complaint,
    Consultation, Diagnosis, Vitals,PatientFeedback,
)
from consultations.api.serializers import (
    AdviceSerializer, AdviceTemplateSerializer,
    ComplaintSerializer, ConsultationSummarySerializer,
    DiagnosisSerializer, EndConsultationSerializer,
    StartConsultationSerializer, VitalsSerializer,
    ConsultationTagSerializer,PatientTimelineSerializer,PatientFeedbackSerializer
)
from consultations.utils import render_pdf
from patient_account.models import PatientProfile
from clinic.models import Clinic, ClinicAddress

# Logger
logger = logging.getLogger(__name__)

class StartConsultationAPIView(views.APIView):
    permission_classes = [IsAuthenticated]
    authourization_classes = [IsDoctor]
    def post(self, request):
        serializer = StartConsultationSerializer(data=request.data)
        if serializer.is_valid():
            try:
                consultation = serializer.save()
                return Response({
                    "status": True,
                    "message": "Consultation started successfully.",
                    "data": {
                        "consultation_id": str(consultation.id),
                        "consultation_pnr": consultation.consultation_pnr,
                        "prescription_pnr": consultation.prescription_pnr,
                        "started_at": consultation.started_at
                    }
                }, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({
                    "status": False,
                    "message": "An error occurred while starting the consultation.",
                    "error": str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            return Response({
                "status": False,
                "message": "Validation failed.",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

class VitalsAPIView(views.APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def get_consultation(self, consultation_id):
        return get_object_or_404(Consultation, id=consultation_id)

    def get(self, request, consultation_id):
        """
        Retrieve vitals for a consultation
        """
        consultation = self.get_consultation(consultation_id)
        try:
            vitals = consultation.vitals
            serializer = VitalsSerializer(vitals)
            return Response({
                "status": True,
                "message": "Vitals retrieved successfully.",
                "data": serializer.data
            }, status=status.HTTP_200_OK)
        except Vitals.DoesNotExist:
            return Response({
                "status": False,
                "message": "Vitals not found for this consultation."
            }, status=status.HTTP_404_NOT_FOUND)

    @transaction.atomic
    def post(self, request, consultation_id):
        """
        Create or update vitals (idempotent)
        """
        consultation = self.get_consultation(consultation_id)

        try:
            vitals = consultation.vitals
            serializer = VitalsSerializer(vitals, data=request.data, partial=True)
            action = "updated"
        except Vitals.DoesNotExist:
            serializer = VitalsSerializer(data=request.data)
            action = "created"

        if serializer.is_valid():
            if action == "created":
                serializer.save(consultation=consultation)
                http_status = status.HTTP_201_CREATED
            else:
                serializer.save()
                http_status = status.HTTP_200_OK

            return Response({
                "status": True,
                "message": f"Vitals {action} successfully.",
                "data": serializer.data
            }, status=http_status)

        return Response({
            "status": False,
            "message": "Validation failed.",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def patch(self, request, consultation_id):
        """
        Partially update vitals
        """
        consultation = self.get_consultation(consultation_id)

        try:
            vitals = consultation.vitals
        except Vitals.DoesNotExist:
            return Response({
                "status": False,
                "message": "Vitals not found for this consultation."
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = VitalsSerializer(vitals, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "status": True,
                "message": "Vitals updated successfully.",
                "data": serializer.data
            }, status=status.HTTP_200_OK)

        return Response({
            "status": False,
            "message": "Validation failed.",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def delete(self, request, consultation_id):
        """
        Delete vitals
        """
        consultation = self.get_consultation(consultation_id)

        try:
            vitals = consultation.vitals
            vitals.delete()
            return Response({
                "status": True,
                "message": "Vitals deleted successfully."
            }, status=status.HTTP_200_OK)
        except Vitals.DoesNotExist:
            return Response({
                "status": False,
                "message": "Vitals not found for this consultation."
            }, status=status.HTTP_404_NOT_FOUND)

class ComplaintAPIView(views.APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def get_object(self, consultation_id, complaint_id):
        return get_object_or_404(Complaint, id=complaint_id, consultation_id=consultation_id)

    def get(self, request, consultation_id, complaint_id=None):
        """
        Retrieve all or one complaint for a consultation
        """
        if complaint_id:
            complaint = self.get_object(consultation_id, complaint_id)
            serializer = ComplaintSerializer(complaint)
            return Response({
                "status": True,
                "message": "Complaint retrieved.",
                "data": serializer.data
            }, status=status.HTTP_200_OK)

        complaints = Complaint.objects.filter(consultation_id=consultation_id)
        serializer = ComplaintSerializer(complaints, many=True)
        return Response({
            "status": True,
            "message": "Complaints list retrieved.",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    @transaction.atomic
    def post(self, request, consultation_id):
        """
        Add a new complaint to a consultation
        """
        consultation = get_object_or_404(Consultation, id=consultation_id)

        serializer = ComplaintSerializer(data=request.data, context={'consultation_id': consultation_id})
        if serializer.is_valid():
            Complaint.objects.create(consultation=consultation, **serializer.validated_data)
            return Response({
                "status": True,
                "message": "Complaint added successfully."
            }, status=status.HTTP_201_CREATED)

        return Response({
            "status": False,
            "message": "Validation failed.",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def patch(self, request, consultation_id, complaint_id):
        """
        Update a complaint
        """
        complaint = self.get_object(consultation_id, complaint_id)
        serializer = ComplaintSerializer(complaint, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "status": True,
                "message": "Complaint updated successfully.",
                "data": serializer.data
            }, status=status.HTTP_200_OK)

        return Response({
            "status": False,
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def delete(self, request, consultation_id, complaint_id):
        """
        Delete a complaint
        """
        complaint = self.get_object(consultation_id, complaint_id)
        complaint.delete()
        return Response({
            "status": True,
            "message": "Complaint deleted successfully."
        }, status=status.HTTP_200_OK)

class DiagnosisAPIView(views.APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def get_object(self, consultation_id, diagnosis_id):
        return get_object_or_404(Diagnosis, id=diagnosis_id, consultation_id=consultation_id)

    def get(self, request, consultation_id, diagnosis_id=None):
        """
        List all diagnoses or fetch a single diagnosis
        """
        if diagnosis_id:
            diagnosis = self.get_object(consultation_id, diagnosis_id)
            serializer = DiagnosisSerializer(diagnosis)
            return Response({
                "status": True,
                "message": "Diagnosis retrieved successfully.",
                "data": serializer.data
            }, status=status.HTTP_200_OK)

        diagnoses = Diagnosis.objects.filter(consultation_id=consultation_id)
        serializer = DiagnosisSerializer(diagnoses, many=True)
        return Response({
            "status": True,
            "message": "Diagnoses list retrieved.",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    @transaction.atomic
    def post(self, request, consultation_id):
        """
        Create a diagnosis (idempotent)
        """
        consultation = get_object_or_404(Consultation, id=consultation_id)
        request.data['consultation'] = str(consultation.id)

        # Check for duplicate
        existing = Diagnosis.objects.filter(
            consultation=consultation,
            code=request.data.get('code'),
            description=request.data.get('description'),
            location=request.data.get('location'),
            diagnosis_type=request.data.get('diagnosis_type'),
        ).first()

        if existing:
            return Response({
                "status": False,
                "message": "Duplicate diagnosis entry found."
            }, status=status.HTTP_400_BAD_REQUEST)

        serializer = DiagnosisSerializer(data=request.data)
        if serializer.is_valid():
            diagnosis = serializer.save()
            return Response({
                "status": True,
                "message": "Diagnosis created successfully.",
                "data": serializer.data
            }, status=status.HTTP_201_CREATED)

        return Response({
            "status": False,
            "message": "Validation failed.",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def patch(self, request, consultation_id, diagnosis_id):
        """
        Partial update diagnosis
        """
        diagnosis = self.get_object(consultation_id, diagnosis_id)
        serializer = DiagnosisSerializer(diagnosis, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "status": True,
                "message": "Diagnosis updated successfully.",
                "data": serializer.data
            }, status=status.HTTP_200_OK)
        return Response({
            "status": False,
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def delete(self, request, consultation_id, diagnosis_id):
        """
        Delete diagnosis
        """
        diagnosis = self.get_object(consultation_id, diagnosis_id)
        diagnosis.delete()
        return Response({
            "status": True,
            "message": "Diagnosis deleted successfully."
        }, status=status.HTTP_200_OK)

class AdviceTemplateListCreateAPIView(generics.ListCreateAPIView):
    queryset = AdviceTemplate.objects.all().order_by('description')
    serializer_class = AdviceTemplateSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]  # Could be changed to [AllowAny] if patients are also allowed

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        serializer = AdviceTemplateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "status": True,
                "message": "Advice template created successfully.",
                "data": serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response({
            "status": False,
            "message": "Validation failed.",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

class AdviceTemplateDetailAPIView(views.APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get_object(self, template_id):
        return get_object_or_404(AdviceTemplate, id=template_id)

    def patch(self, request, template_id):
        template = self.get_object(template_id)
        serializer = AdviceTemplateSerializer(template, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "status": True,
                "message": "Advice template updated successfully.",
                "data": serializer.data
            }, status=status.HTTP_200_OK)
        return Response({
            "status": False,
            "message": "Validation failed.",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def delete(self, request, template_id):
        template = self.get_object(template_id)
        template.delete()
        return Response({
            "status": True,
            "message": "Advice template deleted successfully."
        }, status=status.HTTP_200_OK)

class AdviceAPIView(views.APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def get(self, request, consultation_id, advice_id=None):
        """
        GET one or all advice records for a consultation
        """
        if advice_id:
            advice = get_object_or_404(Advice,\
                                    id=advice_id, \
                                    consultation_id=consultation_id)
            serializer = AdviceSerializer(advice)
            return Response({
                "status": True,
                "message": "Advice retrieved successfully.",
                "data": serializer.data
            }, status=status.HTTP_200_OK)

        advices = Advice.objects.filter(consultation_id=consultation_id).order_by('created_at')
        serializer = AdviceSerializer(advices, many=True)
        return Response({
            "status": True,
            "message": "Advice list retrieved successfully.",
            "data": serializer.data
        }, status=status.HTTP_200_OK)
    @transaction.atomic
    def post(self, request, consultation_id):
        consultation = get_object_or_404(Consultation, id=consultation_id)
        data = request.data
        data['consultation'] = str(consultation.id)

        # Check duplicate
        templates = data.get('advice_templates', [])
        custom_text = data.get('custom_advice', '').strip()

        if Advice.objects.filter(
            consultation=consultation,
            custom_advice=custom_text,
            advice_templates__in=templates
        ).exists():
            return Response({
                "status": False,
                "message": "Duplicate advice entry found."
            }, status=status.HTTP_400_BAD_REQUEST)

        serializer = AdviceSerializer(data=data)
        if serializer.is_valid():
            advice = serializer.save()
            if 'advice_templates' in data:
                advice.advice_templates.set(data['advice_templates'])
            return Response({
                "status": True,
                "message": "Advice added successfully.",
                "data": AdviceSerializer(advice).data
            }, status=status.HTTP_201_CREATED)

        return Response({
            "status": False,
            "message": "Validation failed.",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def patch(self, request, consultation_id, advice_id):
        advice = get_object_or_404(Advice, id=advice_id, consultation_id=consultation_id)

        serializer = AdviceSerializer(advice, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            if 'advice_templates' in request.data:
                updated.advice_templates.set(request.data['advice_templates'])
            return Response({
                "status": True,
                "message": "Advice updated successfully.",
                "data": AdviceSerializer(updated).data
            }, status=status.HTTP_200_OK)
        return Response({
            "status": False,
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def delete(self, request, consultation_id, advice_id):
        advice = get_object_or_404(Advice, id=advice_id, consultation_id=consultation_id)
        advice.delete()
        return Response({
            "status": True,
            "message": "Advice deleted successfully."
        }, status=status.HTTP_200_OK)

class EndConsultationAPIView(APIView):
    permission_classes = [IsAuthenticated]
    authourization_classes = [IsDoctor]

    def get_consultation(self, consultation_id):
        try:
            return Consultation.objects.get(id=consultation_id)
        except Consultation.DoesNotExist:
            return None

    @transaction.atomic
    def post(self, request, consultation_id):
        consultation = get_object_or_404(Consultation, id=consultation_id)
        
        # Inject consultation ID into request data
        request.data['consultation'] = str(consultation.id)

        serializer = AdviceSerializer(data=request.data)
        if serializer.is_valid():
            advice = serializer.save()  # consultation is now passed in data
            if 'advice_templates' in request.data:
                advice.advice_templates.set(request.data['advice_templates'])
            return Response({
                "status": True,
                "message": "Advice added successfully.",
                "data": AdviceSerializer(advice).data
            }, status=status.HTTP_201_CREATED)

        return Response({
            "status": False,
            "message": "Validation failed.",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    def patch(self, request, consultation_id):
        consultation = self.get_consultation(consultation_id)
        if not consultation:
            return Response({"status": False, "message": "Consultation not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = EndConsultationSerializer(data=request.data, partial=True)
        if serializer.is_valid():
            data = serializer.validated_data
            if 'closure_note' in data:
                consultation.closure_note = data['closure_note']
            if 'follow_up_date' in data:
                consultation.follow_up_date = data['follow_up_date']
            consultation.save()

            return Response({
                "status": True,
                "message": "Consultation updated.",
                "data": {
                    "consultation_id": str(consultation.id),
                    "is_finalized": consultation.is_finalized,
                    "is_active": consultation.is_active,
                    "follow_up_date": consultation.follow_up_date,
                    "ended_at": consultation.ended_at,
                    "closure_note": consultation.closure_note
                }
            }, status=status.HTTP_200_OK)

        return Response({"status": False, "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
    
class ConsultationSummaryView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ConsultationSummarySerializer

    def get_object(self):
        consultation_id = self.kwargs.get('pk')
        try:
            return (
                Consultation.objects
                .select_related('doctor', 'patient_profile')
                .prefetch_related(
                    'vitals',
                    'complaints',
                    'diagnoses',
                    'prescriptions',
                    'advices__advice_templates',
                    'test_recommendations__test',
                    'package_recommendations__package'
                )
                .get(id=consultation_id)
            )
        except Consultation.DoesNotExist:
            raise NotFound("Consultation not found")

@csrf_exempt
def test_pdf(request):
    context = {
        'doctor': {'name': 'डॉ. शर्मा'},
        'patient': {'name': 'राम', 'age': 30},
        'medicines': [
            {'name': 'Paracetamol', 'dosage': '500mg दिन में दो बार'},
            {'name': 'Cetirizine', 'dosage': 'रात में एक बार'},
        ]
    }
    filename = 'test.pdf'
    output_path = os.path.join('media', 'prescriptions', 'test.pdf')
    render_pdf('prescriptions/base.html', context, output_path)
    #TO get the file donwload
    #return FileResponse(open(output_path, 'rb'), content_type='application/pdf')
    return JsonResponse({
        'status': 'success',
        'pdf_url': f'/media/prescriptions/{filename}'
    })


# --- Global Clinic Data (Assumed static for now, as not in ConsultationSummarySerializer) ---
CLINIC_NAME = "Doctor Endocrine Diabetes & Thyroid Clinic"
CLINIC_ADDRESS = "#102, Block A, Long Street 1, New Delhi-110 0001"
CLINIC_CONTACT = "Contact: +91-1254878550 | Email: drdavidkhan@example.com"

# --- Helper to format dosage timing (e.g., ["before_breakfast", "after_lunch", "bedtime"] -> "1-1-1") ---
def format_dosage_timing(timing_schedule):
    """
    Converts a list of timing schedules into a 'X-Y-Z' format for dosage.
    Assumes order: Morning, Afternoon, Night.
    """
    morning = '0'
    afternoon = '0'
    night = '0'

    for timing in timing_schedule:
        if 'morning' in timing or 'breakfast' in timing:
            morning = '1'
        elif 'afternoon' in timing or 'lunch' in timing:
            afternoon = '1'
        elif 'night' in timing or 'dinner' in timing or 'bedtime' in timing:
            night = '1'
    return f"{morning}-{afternoon}-{night}"

# --- Common Header/Footer Drawing Logic ---
def header_footer_template_common(canvas_obj, doc, doctor_data,clinic_data):
    """
    Draws the header and footer on each page using dynamic doctor data.
    """
    canvas_obj.saveState()
    styles = getSampleStyleSheet()

    # Define custom styles for header/footer content within the canvas (Font size increased by 1)
    styles.add(ParagraphStyle(name='ClinicHeaderCanvas', fontSize=17, leading=19, alignment=TA_LEFT, fontName='Helvetica-Bold', textColor=HexColor('#003366')))
    styles.add(ParagraphStyle(name='DoctorNameHeaderCanvas', fontSize=13, leading=15, alignment=TA_RIGHT, fontName='Helvetica-Bold', textColor=HexColor('#003366')))
    styles.add(ParagraphStyle(name='NormalLeftCanvas', fontSize=9, leading=10, alignment=TA_LEFT))
    styles.add(ParagraphStyle(name='NormalRightCanvas', fontSize=9, leading=10, alignment=TA_RIGHT))
    styles.add(ParagraphStyle(name='FooterCanvas', fontSize=7, leading=9, alignment=TA_CENTER, textColor=HexColor('#666666')))

    # --- Header Content ---
    # Define the top Y coordinate for the header content.
    header_draw_start_y = A4[1] - (0.5 * inch) # Start 0.5 inch from the absolute top of the page

    # Clinic details (left) - using global constants for now
    # clinic_name = clinic_data.get('name', 'N/A')
    # clinic_address = clinic_data.get('address', 'N/A')
    # clinic_contact = f"Contact: {clinic_data.get('contact_number_primary', 'N/A')} | Email: {clinic_data.get('email_address', 'N/A')}"

    # clinic_name_p = Paragraph(CLINIC_NAME, styles['ClinicHeaderCanvas'])
    # clinic_address_p = Paragraph(CLINIC_ADDRESS, styles['NormalLeftCanvas'])
    # clinic_contact_p = Paragraph(CLINIC_CONTACT, styles['NormalLeftCanvas'])

    # Clinic details (left) - using dynamic clinic_data
    clinic_name = clinic_data.get('name', 'N/A') if clinic_data else "Clinic Name N/A"
    clinic_address_parts = []
    if clinic_data and clinic_data.get('address'):
        addr = clinic_data['address']
        if addr.get('address'): clinic_address_parts.append(addr['address'])
        if addr.get('address2'): clinic_address_parts.append(addr['address2'])
        if addr.get('city'): clinic_address_parts.append(addr['city'])
        if addr.get('state'): clinic_address_parts.append(addr['state'])
        if addr.get('pincode'): clinic_address_parts.append(addr['pincode'])
        if addr.get('country'): clinic_address_parts.append(addr['country'])
    clinic_address = ", ".join(clinic_address_parts) if clinic_address_parts else "Clinic Address N/A"

    clinic_contact_primary = clinic_data.get('contact_number_primary', 'N/A') if clinic_data else 'N/A'
    clinic_email = clinic_data.get('email_address', 'N/A') if clinic_data else 'N/A'
    clinic_contact = f"Contact: {clinic_contact_primary} | Email: {clinic_email}"
    clinic_name_p = Paragraph(clinic_name, styles['ClinicHeaderCanvas'])
    clinic_address_p = Paragraph(clinic_address, styles['NormalLeftCanvas'])
    clinic_contact_p = Paragraph(clinic_contact, styles['NormalLeftCanvas'])
    # Doctor details (right) - using dynamic data
    #doctor_name = doctor_data.get('first_name', '') + " " + doctor_data.get('last_name', '') if doctor_data else "Dr. [Name Missing]"
    doctor_first_name = doctor_data.get('user', {}).get('first_name', '')
    doctor_last_name = doctor_data.get('user', {}).get('last_name', '')
    doctor_name = f"{doctor_first_name} {doctor_last_name}".strip() if doctor_first_name or doctor_last_name else "Dr. [Name Missing]"
    
    #doctor_name =f"{doctor_data.get('first_name', '')} {doctor_data.get('last_name', '')}".strip() if doctor_data else "Dr. [Name Missing]"
    #doctor_qualification = "MD. DM(Endocrinology)" # Assuming static for now or needs to come from doctor_data
    #doctor_reg_no = "Reg no: 2011/03/0577" # Assuming static for now or needs to come from doctor_data
    #doctor_title = "Consultant Diabetologist and Endocrinologist" # Assuming static for now or needs to come from doctor_data
    #doctor_contact = f"Email: {doctor_data.get('email', 'N/A')} | Mobile: {doctor_data.get('secondary_mobile_number', 'N/A')}" if doctor_data else "Contact: N/A"
    
    # Dynamically get Qualification from 'education' list
    qualifications = [edu.get('qualification') for edu in doctor_data.get('education', []) if edu.get('qualification')]
    doctor_qualification = ", ".join(qualifications) if qualifications else "Qualification: N/A"
    # Dynamically get Registration Number
    doctor_reg_no = doctor_data.get('registration', {}).get('medical_registration_number', 'Reg No: N/A')
    doctor_reg_no = f"Reg No: {doctor_reg_no}" if doctor_reg_no else "Reg No: N/A"
    # Dynamically get Contact Details
    doctor_contact_mobile = doctor_data.get('secondary_mobile_number', 'N/A')
    doctor_contact_email = doctor_data.get('user', {}).get('email', 'N/A')
    doctor_contact = f"Email: {doctor_contact_email} | Mobile: {doctor_contact_mobile}"
    # MODIFIED: Dynamically get Title from the top-level 'title' field in doctor_data
    doctor_title = doctor_data.get('title', 'Specialization: N/A') 
    # If 'title' is empty or not present, fallback to 'specializations' as a secondary option
    if not doctor_title or doctor_title == 'Specialization: N/A':
        specializations = [spec.get('specialization') for spec in doctor_data.get('specializations', []) if spec.get('specialization')]
        doctor_title = ", ".join(specializations) if specializations else "Specialization: N/A"
    # Create Paragraph objects for doctor details
    doctor_name_p = Paragraph(doctor_name, styles['DoctorNameHeaderCanvas'])
    doctor_qualification_p = Paragraph(doctor_qualification, styles['NormalRightCanvas'])
    doctor_reg_no_p = Paragraph(doctor_reg_no, styles['NormalRightCanvas'])
    doctor_title_p = Paragraph(doctor_title, styles['NormalRightCanvas'])
    doctor_contact_p = Paragraph(doctor_contact, styles['NormalRightCanvas'])

    # Draw clinic details on left
    current_y_left = header_draw_start_y
    # Clinic Name
    w, h = clinic_name_p.wrapOn(canvas_obj, 4 * inch, 1 * inch)
    clinic_name_p.drawOn(canvas_obj, doc.leftMargin, current_y_left - h)
    current_y_left -= h + 0.05 * inch # Smaller spacer

    # Clinic Address
    w, h = clinic_address_p.wrapOn(canvas_obj, 4 * inch, 1 * inch)
    clinic_address_p.drawOn(canvas_obj, doc.leftMargin, current_y_left - h)
    current_y_left -= h + 0.05 * inch # Smaller spacer

    # Clinic Contact
    w, h = clinic_contact_p.wrapOn(canvas_obj, 4 * inch, 1 * inch)
    clinic_contact_p.drawOn(canvas_obj, doc.leftMargin, current_y_left - h)

    # Draw doctor details on right
    current_y_right = header_draw_start_y
    # Doctor Name
    w, h = doctor_name_p.wrapOn(canvas_obj, 3 * inch, 1 * inch)
    doctor_name_p.drawOn(canvas_obj, A4[0] - doc.rightMargin - 3 * inch, current_y_right - h)
    current_y_right -= h + 0.05 * inch # Smaller spacer

    # Doctor Qualification
    w, h = doctor_qualification_p.wrapOn(canvas_obj, 3 * inch, 1 * inch)
    doctor_qualification_p.drawOn(canvas_obj, A4[0] - doc.rightMargin - 3 * inch, current_y_right - h)
    current_y_right -= h + 0.05 * inch # Smaller spacer

    # Doctor Reg No
    w, h = doctor_reg_no_p.wrapOn(canvas_obj, 3 * inch, 1 * inch)
    doctor_reg_no_p.drawOn(canvas_obj, A4[0] - doc.rightMargin - 3 * inch, current_y_right - h)
    current_y_right -= h + 0.05 * inch # Smaller spacer

    # Doctor Title
    w, h = doctor_title_p.wrapOn(canvas_obj, 3 * inch, 1 * inch)
    doctor_title_p.drawOn(canvas_obj, A4[0] - doc.rightMargin - 3 * inch, current_y_right - h)
    current_y_right -= h + 0.05 * inch # Smaller spacer

    # Doctor Contact
    w, h = doctor_contact_p.wrapOn(canvas_obj, 3 * inch, 1 * inch)
    doctor_contact_p.drawOn(canvas_obj, A4[0] - doc.rightMargin - 3 * inch, current_y_right - h)


    # --- Footer Content ---
    # Define the bottom Y coordinate for the footer content.
    footer_draw_start_y = 0.75 * inch # Start 0.75 inch from the absolute bottom of the page

    footer_text_p = Paragraph("This is a digitally signed prescription. Powered by DoctorProCare.com", styles['FooterCanvas'])
    emergency_contact_p = Paragraph("In case of emergency, contact: emergency@example.com or +91-9988776655", styles['FooterCanvas'])
    page_number_text = f"Page {doc.page}"

    # Draw emergency contact first (lower)
    w, h = emergency_contact_p.wrapOn(canvas_obj, A4[0] - doc.leftMargin - doc.rightMargin, 1 * inch)
    emergency_contact_p.drawOn(canvas_obj, doc.leftMargin, footer_draw_start_y)
    
    # Draw footer text above emergency contact
    w, h_footer_text = footer_text_p.wrapOn(canvas_obj, A4[0] - doc.leftMargin - doc.rightMargin, 1 * inch)
    footer_text_p.drawOn(canvas_obj, doc.leftMargin, footer_draw_start_y + h + 0.1 * inch) # 0.1 inch spacer

    # Page number (centered below other footer text) (Font size increased by 1)
    canvas_obj.setFont('Helvetica', 7) # Ensure font is set right before drawing
    canvas_obj.drawCentredString(A4[0] / 2.0, 0.3 * inch, page_number_text) # Fixed position from bottom

    canvas_obj.restoreState()

# --- Page callback functions for SimpleDocTemplate ---
def on_first_page(canvas_obj, doc):
    """Callback for the first page."""
    # Pass doctor data to the common header/footer function
    # NOTE: doctor_data is not directly available here in the global scope.
    # It will be passed from generate_prescription_pdf_content.
    # For now, we'll use a placeholder or assume it's passed via doc.
    # A more robust solution would be to pass it as an argument to doc.build
    # and then retrieve it in the callback.
    # For this example, we'll modify doc.build to pass a lambda with doctor_data.
    pass # This will be handled by the lambda in doc.build

def on_later_pages(canvas_obj, doc):
    """Callback for all subsequent pages."""
    # This will be handled by the lambda in doc.build
    pass # This will be handled by the lambda in doc.build

# --- Helper function to generate PDF content ---
def generate_prescription_pdf_content(buffer, consultation_data):
    """
    Generates the PDF content using ReportLab with dynamic data from consultation_data.
    """
    # Extract data from consultation_data
    doctor_data = consultation_data.get('doctor', {})
    clinic_data = consultation_data.get('clinic', {})
    patient_data = consultation_data.get('patient', {})
    vitals_data = consultation_data.get('vitals', {})
    prescriptions_data = consultation_data.get('prescriptions', [])
    advices_data = consultation_data.get('advices', [])
    test_recommendations_data = consultation_data.get('test_recommendations', [])
    diagnoses_data = consultation_data.get('diagnoses', [])
    package_recommendations_data = consultation_data.get('package_recommendations', [])
    # Calculate patient age
    patient_dob_str = patient_data.get('date_of_birth', '2000-01-01')
    try:
        patient_dob = timezone.datetime.strptime(patient_dob_str, '%Y-%m-%d').date()
        today = timezone.localdate()  # IST-aware current date
        patient_age = today.year - patient_dob.year - (
            (today.month, today.day) < (patient_dob.month, patient_dob.day)
        )
        patient_age_gender_display = f"{patient_age}y, {patient_data.get('gender', 'N/A')}"
    except Exception:
        patient_age_gender_display = f"N/A, {patient_data.get('gender', 'N/A')}"
    # try:
    #     patient_dob = datetime.strptime(patient_dob_str, '%Y-%m-%d')
    #     patient_age = datetime.now().year - patient_dob.year - ((datetime.now().month, datetime.now().day) < (patient_dob.month, patient_dob.day))
    #     patient_age_gender_display = f"{patient_age}y, {patient_data.get('gender', 'N/A')}"
    # except ValueError:
    #     patient_age_gender_display = f"N/A, {patient_data.get('gender', 'N/A')}"
    patient_name = f"{patient_data.get('first_name', '')} {patient_data.get('last_name', '')}"
    #patient_age_gender = f"{datetime.now().year - datetime.strptime(patient_data.get('date_of_birth', '2000-01-01'), '%Y-%m-%d').year}y, {patient_data.get('gender', 'N/A')}"
    #prescription_date = datetime.strptime(consultation_data.get('started_at', datetime.now().isoformat()), '%Y-%m-%dT%H:%M:%S.%fZ').strftime("%Y-%m-%d")
    prescription_date = timezone.localdate().strftime("%Y-%m-%d")
    patient_height = f"{vitals_data.get('height_cm', 'N/A')} cm"
    patient_weight = f"{vitals_data.get('weight_kg', 'N/A')} kg"
    follow_up_date = consultation_data.get('follow_up_date', 'N/A')

    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            rightMargin=72, leftMargin=72,
                            topMargin=180, # Ample space for header
                            bottomMargin=120) # Ample space for footer
    styles = getSampleStyleSheet()

    # Custom styles with optimized leading (line spacing) and increased font size by 1
    styles.add(ParagraphStyle(name='NormalLeft', fontSize=9, leading=10, alignment=TA_LEFT))
    styles.add(ParagraphStyle(name='BoldLeft', fontSize=9, leading=10, alignment=TA_LEFT, fontName='Helvetica-Bold'))
    styles.add(ParagraphStyle(name='Small', fontSize=7, leading=8, alignment=TA_LEFT))
    styles.add(ParagraphStyle(name='NormalRight', fontSize=9, leading=10, alignment=TA_RIGHT))

    styles.add(ParagraphStyle(name='SectionHeader', fontSize=11, leading=13, alignment=TA_LEFT, fontName='Helvetica-Bold', textColor=HexColor('#336699')))

    styles.add(ParagraphStyle(name='MedicineTableHeader', fontSize=9, leading=10, alignment=TA_CENTER, fontName='Helvetica-Bold'))
    styles.add(ParagraphStyle(name='MedicineTableCell', fontSize=8, leading=9, alignment=TA_LEFT))

    styles.add(ParagraphStyle(name='ListItem', fontSize=9, leading=11, alignment=TA_LEFT))

    # Define the main story for the document
    Story = []

    # --- Patient Details ---
    patient_data_table = [
        [Paragraph(f"<b>Patient:</b> {patient_name} ({patient_age_gender_display})", styles['BoldLeft']),
         Paragraph(f"<b>Date:</b> {prescription_date}", styles['BoldLeft'])],
        [Paragraph(f"<b>Height:</b> {patient_height}", styles['BoldLeft']),
         Paragraph(f"<b>Weight:</b> {patient_weight}", styles['BoldLeft'])]
    ]
    patient_table = Table(patient_data_table, colWidths=[4.0 * inch, 3.0 * inch])
    patient_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    Story.append(patient_table)
    Story.append(Spacer(1, 0.1 * inch))

    # --- Rx (Medicines) Section ---
    Story.append(Paragraph("<u>Rx</u>", styles['SectionHeader']))
    Story.append(Spacer(1, 0.05 * inch))

    # Prepare medicine table data from prescriptions_data
    medicine_table_data = [
        [Paragraph("#", styles['MedicineTableHeader']),
         Paragraph("Medicine", styles['MedicineTableHeader']),
         Paragraph("Dosage", styles['MedicineTableHeader']),
         Paragraph("Duration", styles['MedicineTableHeader']),
         Paragraph("Instructions", styles['MedicineTableHeader'])]
    ]
    for i, med in enumerate(prescriptions_data):
        # Format dosage
        dosage_str = f"{med.get('dosage_amount', 'N/A')} {med.get('dosage_unit', 'N/A')}"
        if med.get('timing_schedule'):
            dosage_str += f" ({format_dosage_timing(med['timing_schedule'])})"

        # Format duration
        duration_str = "Indefinite"
        if med.get('duration_type') == 'fixed' and med.get('duration_in_days') is not None:
            duration_str = f"{med['duration_in_days']} Days"

        medicine_table_data.append([
            Paragraph(str(i+1), styles['MedicineTableCell']),
            Paragraph(med.get('drug_name', 'N/A'), styles['MedicineTableCell']),
            Paragraph(dosage_str, styles['MedicineTableCell']),
            Paragraph(duration_str, styles['MedicineTableCell']),
            Paragraph(med.get('instructions', 'N/A'), styles['MedicineTableCell'])
        ])

    medicine_table = Table(medicine_table_data, colWidths=[0.5*inch, 2.0*inch, 1.0*inch, 1.0*inch, 2.5*inch])
    medicine_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#E0E0E0')),
        ('TEXTCOLOR', (0, 0), (-1, 0), black),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('ALIGN', (0, 1), (0, -1), 'CENTER'),
        ('ALIGN', (1, 1), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('BACKGROUND', (0, 1), (-1, -1), HexColor('#F5F5F5')),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#CCCCCC')),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    Story.append(medicine_table)
    Story.append(Spacer(1, 0.2 * inch))

    # --- Advice Section ---
    Story.append(Paragraph("<u>Advice</u>", styles['SectionHeader']))
    Story.append(Spacer(1, 0.05 * inch))
    if advices_data:
        for item in advices_data:
            # Prioritize custom_advice, otherwise indicate template IDs are not resolved here
            advice_text = item.get('custom_advice')
            if not advice_text and item.get('advice_templates'):
                # In a real scenario, you would fetch the description from AdviceTemplate model
                # For this example, we'll just indicate that templates are not resolved
                advice_text = f"Advice from template IDs: {', '.join(item['advice_templates'])}"
            elif not advice_text:
                advice_text = "N/A"
            Story.append(Paragraph(f"• {advice_text}", styles['ListItem']))
    else:
        Story.append(Paragraph("• No advice provided.", styles['ListItem']))
    Story.append(Spacer(1, 0.2 * inch))

    # --- Investigations / Tests Recommended Section ---
    Story.append(Paragraph("<u>Lab Tests</u>", styles['SectionHeader']))
    Story.append(Spacer(1, 0.05 * inch))
    if test_recommendations_data:
        for item in test_recommendations_data:
            test_name = item.get('custom_name') or item.get('test_name', 'N/A')
            # notes = item.get('notes', '')
            # doctor_comment = item.get('doctor_comment', '')
            full_text = f"{test_name}"
            # if notes:
            #     full_text += f" (Notes: {notes})"
            # if doctor_comment:
            #     full_text += f" (Doctor Comment: {doctor_comment})"
            Story.append(Paragraph(f"• {full_text}", styles['ListItem']))
    else:
        Story.append(Paragraph("• No investigations recommended.", styles['ListItem']))
    Story.append(Spacer(1, 0.2 * inch))

    # --- Diagnoses Section ---
    Story.append(Paragraph("<u>Diagnoses</u>", styles['SectionHeader']))
    Story.append(Spacer(1, 0.05 * inch))
    if diagnoses_data:
        for item in diagnoses_data:
            description = item.get('description', 'N/A')
            #diagnosis_type = item.get('diagnosis_type', 'N/A')
            # location = item.get('location', 'N/A')
            # doctor_note = item.get('doctor_note', '')
            full_text = f"{description} "
            #full_text = f"{description} ({diagnosis_type.capitalize()}"
            # if location != 'N/A': # Only add location if it's meaningful
            #     full_text += f" - {location.capitalize()}"
            # full_text += ")"
            # if doctor_note:
            #     full_text += f": {doctor_note}"
            Story.append(Paragraph(f"• {full_text}", styles['ListItem']))
    else:
        Story.append(Paragraph("• No diagnoses recorded.", styles['ListItem']))
    Story.append(Spacer(1, 0.2 * inch))

    # --- Packages Section ---
    Story.append(Paragraph("<u>Packages</u>", styles['SectionHeader']))
    Story.append(Spacer(1, 0.05 * inch))
    if package_recommendations_data:
        for item in package_recommendations_data:
            package_name = item.get('package_name', 'N/A')
            # notes = item.get('notes', '')
            # doctor_comment = item.get('doctor_comment', '')
            full_text = f"{package_name}"
            # if notes:
            #     full_text += f" (Notes: {notes})"
            # if doctor_comment:
            #     full_text += f" (Doctor Comment: {doctor_comment})"
            Story.append(Paragraph(f"• {full_text}", styles['ListItem']))
    else:
        Story.append(Paragraph("• No packages recommended.", styles['ListItem']))
    Story.append(Spacer(1, 0.2 * inch))

    # --- Follow-up Date ---
    Story.append(Paragraph(f"<b>Follow-up Date:</b> {follow_up_date}", styles['BoldLeft']))
    Story.append(Spacer(1, 0.3 * inch))

    # --- Doctor Signature (appears on the last page of content) ---
    doctor_full_name = f"{doctor_data.get('first_name', '')} {doctor_data.get('last_name', '')}" if doctor_data else "Dr. [Name Missing]"
    Story.append(Paragraph(f"<b>{doctor_full_name}</b>", styles['BoldLeft']))
    Story.append(Paragraph(f"Date: {prescription_date}", styles['NormalLeft']))

    # --- Build the document with custom page callbacks ---
    doc.build(Story, onFirstPage=lambda canvas_obj, doc: header_footer_template_common(canvas_obj, doc, doctor_data,clinic_data),
                     onLaterPages=lambda canvas_obj, doc: header_footer_template_common(canvas_obj, doc, doctor_data,clinic_data))
    return buffer

class GeneratePrescriptionPDFView(APIView):
    """
    API to generate and store prescription PDF for a given consultation.
    """
    def post(self, request, *args, **kwargs):
        consultation_id = request.data.get('consultation_id')
        if not consultation_id:
            return Response({
                "status": "error",
                "message": "consultation_id is required in the request body."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Fetch consultation
            consultation_obj = get_object_or_404(Consultation, id=consultation_id)
            serializer = ConsultationSummarySerializer(consultation_obj)
            consultation_data = serializer.data

            # Extract IDs
            doctor_id = str(consultation_obj.doctor.id)
            patient_id = str(consultation_obj.patient_profile.id)
            prescription_pnr = consultation_obj.prescription_pnr

            # Build filename and path
            timestamp = datetime.now().strftime("%Y%m%d_%H%M")
            pdf_filename = f"RX_{prescription_pnr}_{timestamp}.pdf"
            current_time = datetime.now()
            year = current_time.strftime("%Y")
            month = current_time.strftime("%m")
            relative_path = os.path.join("prescriptions", doctor_id, patient_id, year, month, pdf_filename)
            #relative_path = os.path.join("prescriptions", doctor_id, patient_id, pdf_filename)
            absolute_path = os.path.join(settings.MEDIA_ROOT, relative_path)

            # Ensure directory exists
            os.makedirs(os.path.dirname(absolute_path), exist_ok=True)

            # Generate the PDF
            buffer = io.BytesIO()
            generate_prescription_pdf_content(buffer, consultation_data)
            buffer.seek(0)

            # Save to file
            with open(absolute_path, 'wb') as f:
                f.write(buffer.read())

            # Update consultation
            consultation_obj.prescription_pdf.name = relative_path
            consultation_obj.save()

            # Return response
            return Response({
                "status": "success",
                "message": "Prescription PDF generated successfully.",
                "pdf_filename": pdf_filename,
                "pdf_url": f"{settings.MEDIA_URL}{relative_path}"
            }, status=status.HTTP_200_OK)

        except Consultation.DoesNotExist:
            return Response({
                "status": "error",
                "message": f"Consultation with ID '{consultation_id}' not found."
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                "status": "error",
                "message": f"Failed to generate PDF: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ConsultationHistoryAPIView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated, IsDoctorOrHelpdeskOrOwnerOrAdmin]

    def get(self, request, *args, **kwargs):
        try:
            patient_id = request.query_params.get('patient_id')
            doctor_id = request.query_params.get('doctor_id')
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            page = request.query_params.get('page', 1)
            page_size = request.query_params.get('page_size', 10)

            filters = Q()

            if patient_id:
                filters &= Q(patient_profile__id=patient_id)

            if doctor_id:
                filters &= Q(doctor__id=doctor_id)

            if start_date:
                filters &= Q(started_at__date__gte=parse_date(start_date))

            if end_date:
                filters &= Q(started_at__date__lte=parse_date(end_date))

            consultations = Consultation.objects.filter(filters).select_related(
                'doctor', 'patient_profile'
            ).order_by('-started_at').distinct()

            paginator = Paginator(consultations, page_size)
            try:
                consultations_page = paginator.page(page)
            except PageNotAnInteger:
                consultations_page = paginator.page(1)
            except EmptyPage:
                consultations_page = paginator.page(paginator.num_pages)

            serialized_data = ConsultationSummarySerializer(consultations_page, many=True).data

            return Response({
                "status": "success",
                "message": "Consultation history fetched successfully",
                "count": paginator.count,
                "num_pages": paginator.num_pages,
                "current_page": consultations_page.number,
                "data": serialized_data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error fetching consultation history: {str(e)}")
            return Response({
                "status": "error",
                "message": f"Failed to fetch consultation history: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class GlobalConsultationSearchView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            query = request.query_params.get("query", "")
            doctor_id = request.query_params.get("doctor_id")
            date_from = parse_date(request.query_params.get("date_from"))
            date_to = parse_date(request.query_params.get("date_to"))

            filters = Q()

            if query:
                filters &= Q(complaints__complaint_text__icontains=query) |\
                           Q(diagnoses__description__icontains=query) |\
                           Q(prescriptions__drug_name__icontains=query) |\
                           Q(patient_profile__first_name__icontains=query) |\
                           Q(patient_profile__last_name__icontains=query)

            if doctor_id:
                filters &= Q(doctor__id=doctor_id)

            if date_from:
                filters &= Q(started_at__date__gte=date_from)

            if date_to:
                filters &= Q(started_at__date__lte=date_to)

            consultations = Consultation.objects.filter(filters).distinct().order_by("-started_at")

            serializer = ConsultationSummarySerializer(consultations, many=True)

            return Response({
                "status": "success",
                "message": "Search results fetched successfully",
                "data": serializer.data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"GlobalConsultationSearchView Error: {str(e)}")
            return Response({
                "status": "error",
                "message": f"Failed to perform global search: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TagConsultationView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, consultation_id):
        try:
            consultation = get_object_or_404(Consultation, id=consultation_id)

            serializer = ConsultationTagSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            consultation.tag = serializer.validated_data.get("tag")
            consultation.is_important = serializer.validated_data.get("is_important", False)
            consultation.save()

            logger.info(f"Consultation {consultation_id} tagged by {request.user}")

            return Response({
                "status": "success",
                "message": "Consultation tagged successfully",
                "data": {
                    "consultation_id": str(consultation.id),
                    "tag": consultation.tag,
                    "is_important": consultation.is_important
                }
            }, status=status.HTTP_200_OK)

        except Consultation.DoesNotExist:
            logger.error(f"Consultation {consultation_id} not found.")
            return Response({
                "status": "error",
                "message": "Consultation not found"
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.exception("Error tagging consultation")
            return Response({
                "status": "error",
                "message": f"Something went wrong: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PatientTimelineView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, ] #IsDoctorOrPatient

    def get(self, request, patient_id):
        try:
            start_date = request.GET.get("start_date")
            end_date = request.GET.get("end_date")

            consultations = Consultation.objects.filter(
                patient_profile__id=patient_id
            ).select_related("doctor", "patient_profile") \
             .prefetch_related("complaints", "diagnoses", "prescriptions")

            if start_date:
                consultations = consultations.filter(started_at__date__gte=parse_date(start_date))
            if end_date:
                consultations = consultations.filter(started_at__date__lte=parse_date(end_date))

            # Sort by date desc
            consultations = consultations.order_by("-started_at")

            serializer = PatientTimelineSerializer(consultations, many=True)
            return Response({
                "status": "success",
                "message": "Patient timeline fetched successfully",
                "data": serializer.data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Timeline fetch failed: {e}")
            return Response({
                "status": "error",
                "message": f"Failed to fetch timeline: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ListPrescriptionPDFsView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, patient_id):
        user = request.user

        # --- Role-based access check ---
        if not (user.is_superuser or user.groups.filter(name__in=['doctor', 'patient']).exists()):
            return Response({
                "status": "error",
                "message": "You do not have permission to view this data."
            }, status=status.HTTP_403_FORBIDDEN)

        try:
            # Validate patient
            patient = get_object_or_404(PatientProfile, id=patient_id)

            # Only allow patient to view their own PDFs
            if user.groups.filter(name='patient').exists() and patient.user != user:
                return Response({
                    "status": "error",
                    "message": "You are not allowed to access this patient's records."
                }, status=status.HTTP_403_FORBIDDEN)

            # Fetch consultations with PDFs
            consultations = Consultation.objects.filter(
                patient_profile=patient,
                prescription_pdf__isnull=False
            ).order_by('-started_at')

            # Pagination
            page_number = request.GET.get('page', 1)
            paginator = Paginator(consultations, 10)
            page = paginator.get_page(page_number)

            pdf_data = []
            for consult in page.object_list:
                pdf_data.append({
                    "consultation_id": str(consult.id),
                    "prescription_pnr": consult.prescription_pnr,
                    "doctor_id": str(consult.doctor.id),
                    "doctor_name": consult.doctor.user.first_name + " " + consult.doctor.user.last_name,
                    "started_at": consult.started_at,
                    "pdf_url": request.build_absolute_uri(consult.prescription_pdf.url) if consult.prescription_pdf else None
                })

            return Response({
                "status": "success",
                "message": "Prescription PDFs fetched successfully.",
                "total": paginator.count,
                "page": page.number,
                "pages": paginator.num_pages,
                "data": pdf_data
            }, status=status.HTTP_200_OK)

        except PatientProfile.DoesNotExist:
            return Response({
                "status": "error",
                "message": "Invalid patient ID."
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.exception("Error fetching PDF list")
            return Response({
                "status": "error",
                "message": f"Something went wrong: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PatientFeedbackViewSet(viewsets.ModelViewSet):
    queryset = PatientFeedback.objects.all()
    serializer_class = PatientFeedbackSerializer
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return PatientFeedback.objects.all()
        return PatientFeedback.objects.filter(created_by=user)

class FollowUpAPIView(views.APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def get_object(self, consultation_id):
        return get_object_or_404(Consultation, id=consultation_id)

    def get(self, request, consultation_id):
        consultation = self.get_object(consultation_id)
        return Response({
            "status": True,
            "message": "Follow-up date fetched successfully.",
            "data": {
                "follow_up_date": consultation.follow_up_date
            }
        }, status=status.HTTP_200_OK)

    @transaction.atomic
    def post(self, request, consultation_id):
        consultation = self.get_object(consultation_id)
        follow_up_date = request.data.get("follow_up_date")

        if not follow_up_date:
            return Response({
                "status": False,
                "message": "follow_up_date is required in YYYY-MM-DD format."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            consultation.follow_up_date = follow_up_date
            consultation.save()
            return Response({
                "status": True,
                "message": "Follow-up date set successfully.",
                "data": {
                    "follow_up_date": consultation.follow_up_date
                }
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                "status": False,
                "message": "Failed to update follow-up date.",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @transaction.atomic
    def delete(self, request, consultation_id):
        consultation = self.get_object(consultation_id)
        consultation.follow_up_date = None
        consultation.save()
        return Response({
            "status": True,
            "message": "Follow-up date removed successfully."
        }, status=status.HTTP_200_OK)
from rest_framework import status, views, generics
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.exceptions import NotFound
from account.permissions import IsDoctor
from django.utils import timezone
from consultations.models import (
    Consultation, Vitals,Advice, AdviceTemplate,
    Complaint, Diagnosis)
from consultations.api.serializers import (
    VitalsSerializer,StartConsultationSerializer,ComplaintSerializer,
    DiagnosisSerializer,AdviceSerializer,AdviceTemplateSerializer,ConsultationSummarySerializer,
    EndConsultationSerializer)

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
    permission_classes = [IsAuthenticated]
    authourization_classes = [IsDoctor]
    def post(self, request, consultation_id):
        """
        Create or update vitals for a consultation
        """
        try:
            consultation = Consultation.objects.get(id=consultation_id)
        except Consultation.DoesNotExist:
            return Response({
                "status": False,
                "message": "Consultation not found."
            }, status=status.HTTP_404_NOT_FOUND)

        try:
            # Try to fetch existing vitals
            vitals = consultation.vitals
            # Update vitals (partial update allowed)
            serializer = VitalsSerializer(vitals, data=request.data, partial=True)
            action = "updated"
        except Vitals.DoesNotExist:
            # Create new vitals
            serializer = VitalsSerializer(data=request.data)
            action = "created"

        if serializer.is_valid():
            if action == "updated":
                serializer.save()
            else:
                serializer.save(consultation=consultation)
            return Response({
                "status": True,
                "message": f"Vitals {action} successfully.",
                "data": serializer.data
            }, status=status.HTTP_200_OK if action == "updated" else status.HTTP_201_CREATED)

        return Response({
            "status": False,
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, consultation_id):
        """
        Delete vitals for a consultation
        """
        try:
            consultation = Consultation.objects.get(id=consultation_id)
        except Consultation.DoesNotExist:
            return Response({
                "status": False,
                "message": "Consultation not found."
            }, status=status.HTTP_404_NOT_FOUND)

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
    permission_classes = [IsAuthenticated]
    authourization_classes = [IsDoctor]

    def post(self, request, consultation_id):
        """
        Add new complaint to a consultation
        """
        try:
            consultation = Consultation.objects.get(id=consultation_id)
        except Consultation.DoesNotExist:
            return Response({"status": False, "message": "Consultation not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = ComplaintSerializer(data=request.data, context={'consultation_id': consultation_id})
        if serializer.is_valid():
            Complaint.objects.create(
                consultation=consultation,
                **serializer.validated_data
            )
            return Response({
                "status": True,
                "message": "Complaint added successfully."
            }, status=status.HTTP_201_CREATED)

        return Response({"status": False, "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, consultation_id, complaint_id):
        """
        Update an existing complaint
        """
        try:
            complaint = Complaint.objects.get(id=complaint_id, consultation_id=consultation_id)
        except Complaint.DoesNotExist:
            return Response({"status": False, "message": "Complaint not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = ComplaintSerializer(complaint, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "status": True,
                "message": "Complaint updated successfully."
            }, status=status.HTTP_200_OK)

        return Response({"status": False, "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, consultation_id, complaint_id):
        """
        Delete a complaint
        """
        try:
            complaint = Complaint.objects.get(id=complaint_id, consultation_id=consultation_id)
        except Complaint.DoesNotExist:
            return Response({"status": False, "message": "Complaint not found."}, status=status.HTTP_404_NOT_FOUND)

        complaint.delete()
        return Response({
            "status": True,
            "message": "Complaint deleted successfully."
        }, status=status.HTTP_200_OK)

class DiagnosisAPIView(views.APIView):
    permission_classes = [IsAuthenticated]
    authourization_classes = [IsDoctor]
    def post(self, request, consultation_id):
        """
        Create a diagnosis for a consultation
        """
        try:
            consultation = Consultation.objects.get(id=consultation_id)
        except Consultation.DoesNotExist:
            return Response({"status": False, "message": "Consultation not found."}, status=status.HTTP_404_NOT_FOUND)

        # Add the consultation_id to the request data implicitly
        request.data['consultation'] = consultation.id
        # Check if a diagnosis with the same details already exists
        existing_diagnosis = Diagnosis.objects.filter(
            consultation_id=consultation_id,
            code=request.data.get('code'),
            description=request.data.get('description'),
            location=request.data.get('location'),
            diagnosis_type=request.data.get('diagnosis_type')
        ).exists()

        if existing_diagnosis:
            return Response({
                "status": False,
                "message": "Duplicate diagnosis entry found."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate and create diagnosis
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
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, consultation_id, diagnosis_id):
        """
        Update an existing diagnosis (partial update)
        """
        try:
            diagnosis = Diagnosis.objects.get(id=diagnosis_id, consultation_id=consultation_id)
        except Diagnosis.DoesNotExist:
            return Response({"status": False, "message": "Diagnosis not found."}, status=status.HTTP_404_NOT_FOUND)

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

    def delete(self, request, consultation_id, diagnosis_id):
        """
        Delete a diagnosis from a consultation
        """
        try:
            diagnosis = Diagnosis.objects.get(id=diagnosis_id, consultation_id=consultation_id)
        except Diagnosis.DoesNotExist:
            return Response({"status": False, "message": "Diagnosis not found."}, status=status.HTTP_404_NOT_FOUND)

        diagnosis.delete()
        return Response({
            "status": True,
            "message": "Diagnosis deleted successfully."
        }, status=status.HTTP_200_OK)

class AdviceTemplateListAPIView(generics.ListAPIView):
    queryset = AdviceTemplate.objects.all().order_by('description')
    serializer_class = AdviceTemplateSerializer
    permission_classes = [IsAuthenticated]
    #authourization_classes = [Allow]need to add as this can be use by docotors and patients as well

class AdviceAPIView(views.APIView):
    permission_classes = [IsAuthenticated]
    authourization_classes = [IsDoctor]

    def post(self, request, consultation_id):
        """
        Add advice (templates and/or custom) to a consultation.
        """
        try:
            consultation = Consultation.objects.get(id=consultation_id)
        except Consultation.DoesNotExist:
            return Response({"status": False, "message": "Consultation not found."}, status=status.HTTP_404_NOT_FOUND)
        # Check if an advice with the same details already exists
        existing_advice = Advice.objects.filter(
            consultation_id=consultation_id,
            custom_advice=request.data.get('custom_advice')
            ).filter(
                advice_templates__id__in=request.data.get('advice_templates')
            ).exists()

        if existing_advice:
            return Response({
                "status": False,
                "message": "Duplicate advice entry found."
            }, status=status.HTTP_400_BAD_REQUEST)

        serializer = AdviceSerializer(data=request.data)
        if serializer.is_valid():
            advice = serializer.save(consultation=consultation)
            if 'advice_templates' in request.data:
                advice.advice_templates.set(request.data['advice_templates'])
            return Response({
                "status": True,
                "message": "Advice added successfully.",
                "data": AdviceSerializer(advice).data
            }, status=status.HTTP_201_CREATED)

        return Response({"status": False, "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, consultation_id, advice_id):
        """
        Update an existing advice.
        """
        try:
            advice = Advice.objects.get(id=advice_id, consultation_id=consultation_id)
        except Advice.DoesNotExist:
            return Response({"status": False, "message": "Advice not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = AdviceSerializer(advice, data=request.data, partial=True)
        if serializer.is_valid():
            updated_advice = serializer.save()
            if 'advice_templates' in request.data:
                updated_advice.advice_templates.set(request.data['advice_templates'])
            return Response({
                "status": True,
                "message": "Advice updated successfully.",
                "data": AdviceSerializer(updated_advice).data
            }, status=status.HTTP_200_OK)

        return Response({"status": False, "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, consultation_id, advice_id):
        """
        Delete an advice entry.
        """
        try:
            advice = Advice.objects.get(id=advice_id, consultation_id=consultation_id)
        except Advice.DoesNotExist:
            return Response({"status": False, "message": "Advice not found."}, status=status.HTTP_404_NOT_FOUND)

        advice.delete()
        return Response({"status": True, "message": "Advice deleted successfully."}, status=status.HTTP_200_OK)

class EndConsultationAPIView(APIView):
    permission_classes = [IsAuthenticated]
    authourization_classes = [IsDoctor]

    def get_consultation(self, consultation_id):
        try:
            return Consultation.objects.get(id=consultation_id)
        except Consultation.DoesNotExist:
            return None

    def post(self, request, consultation_id):
        consultation = self.get_consultation(consultation_id)
        if not consultation:
            return Response({"status": False, "message": "Consultation not found."}, status=status.HTTP_404_NOT_FOUND)

        if consultation.is_finalized:
            return Response({"status": False, "message": "Consultation is already finalized."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = EndConsultationSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data

            consultation.closure_note = data.get('closure_note')
            consultation.follow_up_date = data.get('follow_up_date')

            if data.get("confirm"):
                consultation.is_finalized = True
                consultation.is_active = False
                consultation.ended_at = timezone.now()

                # Optional: Trigger prescription PDF, reminders, etc.

            consultation.save()

            return Response({
                "status": True,
                "message": "Consultation finalized." if consultation.is_finalized else "Consultation saved but not finalized.",
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
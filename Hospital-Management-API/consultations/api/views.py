from rest_framework import status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from account.permissions import IsDoctor
from django.utils import timezone
from consultations.models import (
    Consultation, Vitals,
    Complaint, Diagnosis)
from consultations.api.serializers import (
    VitalsSerializer,StartConsultationSerializer,ComplaintSerializer,
    DiagnosisSerializer)

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
        
class EndConsultationAPIView(views.APIView):
    permission_classes = [IsAuthenticated]
    authourization_classes = [IsDoctor]
    def post(self, request, consultation_id):
        try:
            consultation = Consultation.objects.get(id=consultation_id)
        except Consultation.DoesNotExist:
            return Response({
                "status": False,
                "message": "Consultation not found."
            }, status=status.HTTP_404_NOT_FOUND)

        if not consultation.is_active:
            return Response({
                "status": False,
                "message": "Consultation is already ended."
            }, status=status.HTTP_400_BAD_REQUEST)

        consultation.is_active = False
        consultation.ended_at = timezone.now()
        consultation.save()

        return Response({
            "status": True,
            "message": "Consultation ended successfully.",
            "data": {
                "consultation_id": str(consultation.id),
                "ended_at": consultation.ended_at
            }
        }, status=status.HTTP_200_OK)

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

        serializer = ComplaintSerializer(data=request.data)
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
from rest_framework import status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from consultations.api.serializers import StartConsultationSerializer
from account.permissions import IsDoctor
from consultations.models import Consultation
from django.utils import timezone
from consultations.models import Consultation, Vitals
from consultations.api.serializers import VitalsSerializer

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
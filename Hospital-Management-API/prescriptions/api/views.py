from rest_framework import viewsets, permissions
from rest_framework.exceptions import NotFound
from prescriptions.models import Prescription
from prescriptions.api.serializers import PrescriptionSerializer
from consultations.models import Consultation

class PrescriptionViewSet(viewsets.ModelViewSet):
    serializer_class = PrescriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        consultation_id = self.kwargs.get("consultation_id")
        return Prescription.objects.filter(consultation__id=consultation_id)

    def perform_create(self, serializer):
        consultation_id = self.kwargs.get("consultation_id")
        try:
            consultation = Consultation.objects.get(id=consultation_id)
        except Consultation.DoesNotExist:
            raise NotFound("Consultation not found")
        serializer.save(consultation=consultation, created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
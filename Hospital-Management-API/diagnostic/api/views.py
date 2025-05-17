from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.exceptions import NotFound
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.permissions import AllowAny

from diagnostic.models import (MedicalTest,
                               TestCategory,ImagingView,TestRecommendation)
from diagnostic.api.serializers import (
    MedicalTestSerializer,TestCategorySerializer,ImagingViewSerializer,TestRecommendationSerializer)
from consultations.models import Consultation

class MedicalTestViewSet(viewsets.ModelViewSet):
    queryset = MedicalTest.objects.filter(is_active=True).order_by('-created_at')
    serializer_class = MedicalTestSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]

    filterset_fields = ['type', 'category', 'view']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at', 'standard_price']

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False  # Soft delete
        instance.save()
        return Response({"detail": "Test deactivated successfully."}, status=status.HTTP_204_NO_CONTENT)

class TestCategoryViewSet(viewsets.ModelViewSet):
    queryset = TestCategory.objects.all().order_by('-name')
    serializer_class = TestCategorySerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['modality']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'modality']

class ImagingViewViewSet(viewsets.ModelViewSet):
    queryset = ImagingView.objects.all().order_by('name')
    serializer_class = ImagingViewSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name', 'code', 'description']
    ordering_fields = ['name', 'code']

class TestRecommendationViewSet(viewsets.ModelViewSet):
    serializer_class = TestRecommendationSerializer
    permission_classes = [AllowAny]#IsAuthenticated

    def get_queryset(self):
        consultation_id = self.kwargs.get('consultation_id')
        return TestRecommendation.objects.filter(consultation_id=consultation_id)

    def perform_create(self, serializer):
        consultation_id = self.kwargs.get('consultation_id')
        try:
            consultation = Consultation.objects.get(id=consultation_id)
        except Consultation.DoesNotExist:
            raise NotFound("Consultation not found")
        serializer.save(
            consultation=consultation,
            recommended_by=self.request.user
        )

    def get_object(self):
        consultation_id = self.kwargs.get('consultation_id')
        pk = self.kwargs.get('pk')
        try:
            return TestRecommendation.objects.get(id=pk, consultation_id=consultation_id)
        except TestRecommendation.DoesNotExist:
            raise NotFound("Test recommendation not found for this consultation.")
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import NotFound
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.permissions import AllowAny
from utils.utils import api_response

from diagnostic.models import (MedicalTest,
                               TestCategory,ImagingView,TestRecommendation,
                               PackageRecommendation)
from diagnostic.api.serializers import (
    MedicalTestSerializer,TestCategorySerializer,ImagingViewSerializer,
    TestRecommendationSerializer,PackageRecommendationSerializer)
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



class PackageRecommendationViewSet(viewsets.ModelViewSet):
    serializer_class = PackageRecommendationSerializer
    permission_classes = [IsAuthenticated]
    permission_classes = [AllowAny]
    def get_queryset(self):
        consultation_id = self.kwargs.get('consultation_id')
        return PackageRecommendation.objects.filter(consultation_id=consultation_id)

    def get_object(self):
        consultation_id = self.kwargs.get('consultation_id')
        pk = self.kwargs.get('pk')
        try:
            return PackageRecommendation.objects.get(id=pk, consultation_id=consultation_id)
        except PackageRecommendation.DoesNotExist:
            raise NotFound("Package recommendation not found for this consultation.")

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

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return api_response("success", "Package recommendation added", serializer.data, status.HTTP_201_CREATED)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return api_response("success", "Package recommendation updated", serializer.data)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return api_response("success", "Package recommendation deleted", None, status.HTTP_204_NO_CONTENT)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return api_response("success", "Package recommendation details", serializer.data)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return api_response("success", "Package recommendations list", serializer.data)

